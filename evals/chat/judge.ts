/**
 * LLM-as-judge for the live chat eval.
 *
 * Calls the same OpenAI-compatible endpoint the worker uses, directly rather
 * than through /api/chat, so the judge is not subject to the bot's system
 * prompt or its rate limit.
 */
import { DEFAULT_BASE_URL } from "../../worker/config";
import type { CorpusDoc } from "../../worker/types";
import { parseJudge, type EvalCase, type JudgeVerdict } from "./grade";

/**
 * A different model family from the bot's gemma, so the bot is not grading
 * itself. In a side-by-side it caught an omitted detail that gemma passed.
 */
export const DEFAULT_JUDGE_MODEL = "qwen3.8:27b";

export interface JudgeConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export function buildJudgeMessages(corpus: CorpusDoc[], c: EvalCase, reply: string) {
  const documents = corpus
    .map((doc) => `<document route="${doc.route ?? "none"}">\n${doc.text}\n</document>`)
    .join("\n\n");

  const history = (c.history ?? []).map((m) => `${m.role}: ${m.content}`).join("\n");

  const system = `You grade replies from a chatbot on Jerome Yeoh's portfolio website.
The chatbot must answer only from the documents below, which are its complete
knowledge. It must say plainly when the documents do not cover something, cite
routes in square brackets, never write contact details, and decline anything
not about Jerome or his work.

${documents}

Grade the reply on two questions.

1. faithful: is every factual claim about Jerome or his work supported by the
   documents? A statement that the site does not cover something is faithful
   only if the documents really do not cover it. Refusals and offers to help
   with Jerome's work make no factual claim and are faithful.
2. meetsExpectation: does the reply do what the expectation describes?

Respond with only a JSON object, no prose and no code fence:
{"faithful": boolean, "unsupportedClaims": string[], "meetsExpectation": boolean, "reason": string}
List each unsupported claim verbatim. Keep reason to one sentence.`;

  const user = [
    history && `Conversation before the question:\n${history}`,
    `Question: ${c.question}`,
    `Expectation: ${c.expect}`,
    `Reply to grade:\n${reply}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

export async function judge(
  config: JudgeConfig,
  corpus: CorpusDoc[],
  c: EvalCase,
  reply: string,
): Promise<{ ok: true; verdict: JudgeVerdict } | { ok: false; error: string }> {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_JUDGE_MODEL,
        messages: buildJudgeMessages(corpus, c, reply),
        temperature: 0,
        reasoning_effort: "none",
        max_tokens: 800,
        stream: false,
      }),
    });
  } catch (error) {
    return { ok: false, error: `judge request failed: ${(error as Error).message}` };
  }

  if (!response.ok) {
    return { ok: false, error: `judge HTTP ${response.status}: ${(await response.text()).slice(0, 200)}` };
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return parseJudge(data.choices?.[0]?.message?.content ?? "");
}
