/**
 * Live eval for the chat assistant.
 *
 * Sends every case in cases.ts to a running worker, grades the reply with
 * deterministic rules, then asks an LLM judge about faithfulness. Opt-in and
 * outside `npm test`: it spends tokens and the model is not deterministic.
 *
 *   npm run dev:worker -- --port 8787     (terminal 1)
 *   npm run eval:chat                     (terminal 2)
 *
 * Flags:  --only <category|id>[,...]   --no-judge   --delay <ms>
 * Env:    EVAL_TARGET, LLM_API_KEY, LLM_BASE_URL, JUDGE_MODEL
 * See docs/chatbot-testing.md.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { REFUSALS } from "../../worker/prompt";
import { CASES } from "./cases";
import { checkCase, checkGlobal, parseSse, type EvalCase, type JudgeVerdict, type RuleResult } from "./grade";
import { DEFAULT_JUDGE_MODEL, judge } from "./judge";

interface Options {
  only: string[];
  useJudge: boolean;
  delayMs: number;
  target: string;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    only: [],
    useJudge: true,
    // CHAT_RATE_LIMIT allows 10 requests a minute per IP.
    delayMs: 6500,
    target: (process.env.EVAL_TARGET || "http://localhost:8787").replace(/\/+$/, ""),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-judge") options.useJudge = false;
    else if (arg === "--only") options.only = (argv[++i] ?? "").split(",").filter(Boolean);
    else if (arg === "--delay") options.delayMs = Number(argv[++i]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) throw new Error("--delay needs a number of ms");
  return options;
}

/** Reads one key from .dev.vars, which is where the worker's local secret lives. */
function devVar(key: string): string | undefined {
  if (!existsSync(".dev.vars")) return undefined;
  const line = readFileSync(".dev.vars", "utf-8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface CaseResult {
  id: string;
  category: string;
  question: string;
  reply: string;
  status: number;
  latencyMs: number;
  rules: RuleResult[];
  judge?: JudgeVerdict;
  judgeError?: string;
  passed: boolean;
}

async function ask(target: string, c: EvalCase): Promise<{ status: number; reply: string; latencyMs: number }> {
  const started = Date.now();
  const response = await fetch(`${target}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: c.question, history: c.history ?? [] }),
  });
  const body = await response.text();
  return { status: response.status, reply: response.ok ? parseSse(body) : body, latencyMs: Date.now() - started };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!existsSync("worker/corpus.ts")) execSync("npm run build:corpus", { stdio: "inherit" });
  const { CORPUS } = await import("../../worker/corpus");
  const routes = new Set(CORPUS.map((d) => d.route).filter((r): r is string => !!r));

  const cases = options.only.length
    ? CASES.filter((c) => options.only.includes(c.category) || options.only.includes(c.id))
    : CASES;
  if (!cases.length) throw new Error(`no cases match --only ${options.only.join(",")}`);

  const apiKey = process.env.LLM_API_KEY || devVar("LLM_API_KEY");
  if (options.useJudge && !apiKey) {
    throw new Error("the judge needs LLM_API_KEY in the environment or .dev.vars; pass --no-judge to skip it");
  }
  const judgeConfig = {
    apiKey: apiKey ?? "",
    baseUrl: process.env.LLM_BASE_URL || devVar("LLM_BASE_URL"),
    model: process.env.JUDGE_MODEL || devVar("JUDGE_MODEL"),
  };

  console.log(`chat eval: ${cases.length} cases against ${options.target}${options.useJudge ? "" : " (no judge)"}\n`);

  const results: CaseResult[] = [];

  for (const [index, c] of cases.entries()) {
    if (index > 0) await sleep(options.delayMs);

    let answer: Awaited<ReturnType<typeof ask>>;
    try {
      answer = await ask(options.target, c);
    } catch (error) {
      console.error(`cannot reach ${options.target}: ${(error as Error).message}`);
      console.error("start it with: npm run dev:worker -- --port 8787");
      process.exit(2);
    }

    // Infrastructure, not behaviour: grading the rest would only add noise.
    // Every case expects a 200; anything else is the worker, not the model
    // (a wrangler reload answers 503 mid-request, for one).
    if (answer.status !== 200) {
      console.error(`${c.id}: the worker answered HTTP ${answer.status}: ${answer.reply.slice(0, 160)}`);
      process.exit(2);
    }
    if (answer.reply === REFUSALS.upstreamFailed) {
      console.error(`${c.id}: the worker could not reach the model. Check the key and the worker log.`);
      process.exit(2);
    }
    if (answer.reply === REFUSALS.rateLimited) {
      console.error(`${c.id}: rate limited. Raise --delay and rerun.`);
      process.exit(2);
    }

    const rules: RuleResult[] = [
      ...(c.exact === undefined ? checkGlobal(answer.reply, routes, c.maxWords) : []),
      ...checkCase(c, answer.reply),
    ];

    const result: CaseResult = {
      id: c.id,
      category: c.category,
      question: c.question,
      reply: answer.reply,
      status: answer.status,
      latencyMs: answer.latencyMs,
      rules,
      passed: false,
    };

    if (options.useJudge && c.judge !== false) {
      const verdict = await judge(judgeConfig, CORPUS, c, answer.reply);
      if (verdict.ok) result.judge = verdict.verdict;
      else result.judgeError = verdict.error;
    }

    const judged = !options.useJudge || c.judge === false || (!!result.judge && result.judge.faithful && result.judge.meetsExpectation);
    result.passed = rules.every((r) => r.ok) && judged;
    results.push(result);

    const seconds = (answer.latencyMs / 1000).toFixed(1);
    console.log(`${result.passed ? "PASS" : "FAIL"}  ${c.id.padEnd(24)} ${seconds.padStart(5)}s`);
    if (!result.passed) {
      for (const r of rules.filter((r) => !r.ok)) console.log(`        rule  ${r.rule}${r.detail ? `: ${r.detail}` : ""}`);
      if (result.judgeError) console.log(`        judge error: ${result.judgeError}`);
      if (result.judge && !(result.judge.faithful && result.judge.meetsExpectation)) {
        console.log(`        judge faithful=${result.judge.faithful} meetsExpectation=${result.judge.meetsExpectation}: ${result.judge.reason}`);
        for (const claim of result.judge.unsupportedClaims) console.log(`        unsupported: ${claim}`);
      }
      console.log(`        reply: ${answer.reply.replace(/\s+/g, " ").slice(0, 240)}`);
    }
  }

  console.log("\nby category:");
  const categories = [...new Set(results.map((r) => r.category))];
  for (const category of categories) {
    const inCategory = results.filter((r) => r.category === category);
    console.log(`  ${category.padEnd(14)} ${inCategory.filter((r) => r.passed).length}/${inCategory.length}`);
  }

  const passed = results.filter((r) => r.passed).length;
  console.log(`\n${passed}/${results.length} passed`);

  mkdirSync("evals/chat/results", { recursive: true });
  const file = `evals/chat/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(
    file,
    JSON.stringify(
      {
        target: options.target,
        judgeModel: options.useJudge ? judgeConfig.model || DEFAULT_JUDGE_MODEL : null,
        ranAt: new Date().toISOString(),
        passed,
        total: results.length,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`report: ${file}`);

  process.exit(passed === results.length ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});
