import { describe, test, expect } from "vitest";
import { existsSync } from "node:fs";
import { LIMITS, REFUSALS } from "../worker/prompt";
import { CASES } from "../evals/chat/cases";
import { buildJudgeMessages } from "../evals/chat/judge";
import {
  checkCase,
  checkGlobal,
  extractCitations,
  normaliseRoute,
  parseJudge,
  parseSse,
  wordCount,
  type EvalCase,
} from "../evals/chat/grade";

const ROUTES = new Set(["/", "/research", "/projects/kart-telemetry/", "/projects/routlette/#readme"]);

const failed = (results: { rule: string; ok: boolean }[]) => results.filter((r) => !r.ok).map((r) => r.rule);

function base(overrides: Partial<EvalCase> = {}): EvalCase {
  return { id: "X-test", category: "grounded", question: "q", expect: "e", ...overrides };
}

describe("parseSse", () => {
  test("joins text events and ignores [DONE]", () => {
    const body = 'data: {"text":"Hello"}\n\ndata: {"text":" there"}\n\ndata: [DONE]\n\n';
    expect(parseSse(body)).toBe("Hello there");
  });

  test("skips a malformed chunk rather than dropping the reply", () => {
    const body = 'data: {"text":"a"}\n\ndata: {not json\n\ndata: {"text":"b"}\n\n';
    expect(parseSse(body)).toBe("ab");
  });

  test("ignores non-data lines and non-string text", () => {
    const body = ': comment\nevent: x\ndata: {"text":42}\ndata: {"other":"y"}\ndata: {"text":"ok"}\n';
    expect(parseSse(body)).toBe("ok");
  });

  test("an empty stream yields an empty reply", () => {
    expect(parseSse("data: [DONE]\n\n")).toBe("");
  });
});

describe("extractCitations", () => {
  test("picks up routes and document ids, not bracketed prose", () => {
    const reply = "Built in Python [/projects/kart-telemetry/]. See [project:kart-telemetry]. [sic] [note]";
    expect(extractCitations(reply)).toEqual(["/projects/kart-telemetry/", "project:kart-telemetry"]);
  });
});

describe("checkGlobal", () => {
  test("a clean, cited, short reply passes everything", () => {
    const reply = "Jerome built it with Python and Pandas [/projects/kart-telemetry/].";
    expect(failed(checkGlobal(reply, ROUTES))).toEqual([]);
  });

  test("an empty reply fails G1", () => {
    expect(failed(checkGlobal("  ", ROUTES))).toContain("G1 non-empty");
  });

  test("an email, a LinkedIn URL or a phone number fails G3", () => {
    for (const reply of [
      "Write to jeromeyeohhc@gmail.com.",
      "He is at https://www.linkedin.com/in/someone.",
      "Call +65 9123 4567.",
    ]) {
      expect(failed(checkGlobal(reply, ROUTES)), reply).toContain("G3 no contact details");
    }
  });

  test("a year range is not mistaken for a phone number", () => {
    expect(failed(checkGlobal("The study ran 2025-2026 [/research].", ROUTES))).toEqual([]);
  });

  test("citing a document id or a route not in the corpus fails G4", () => {
    expect(failed(checkGlobal("See [project:kart-telemetry].", ROUTES))).toContain("G4 citations are real routes");
    expect(failed(checkGlobal("See [/projects/made-up/].", ROUTES))).toContain("G4 citations are real routes");
  });

  test("a trailing slash does not make a real page invalid", () => {
    // Seen live: the model cites [/pipeline/] for the /pipeline route.
    expect(failed(checkGlobal("See [/research/] and [/projects/kart-telemetry].", ROUTES))).toEqual([]);
  });

  test("a route fused with a document id fails G4", () => {
    // Seen live, and the judge passed it: the widget renders this as dead text.
    expect(failed(checkGlobal("See [/research:databusters/].", ROUTES))).toContain("G4 citations are real routes");
  });

  test("a route with a fragment is valid when the corpus has it", () => {
    expect(failed(checkGlobal("See the readme [/projects/routlette/#readme].", ROUTES))).toEqual([]);
  });

  test("long replies, headings and first-person voice fail G5", () => {
    expect(failed(checkGlobal("word ".repeat(121), ROUTES))).toContain("G5 brevity");
    expect(failed(checkGlobal("word ".repeat(30), ROUTES, 20))).toContain("G5 brevity");
    expect(failed(checkGlobal("## Projects\nRoutlette.", ROUTES))).toContain("G5 no headings");
    expect(failed(checkGlobal("I built Routlette in React Native.", ROUTES))).toContain("G5 third person");
  });

  test("the bot speaking as itself is not first-person Jerome", () => {
    expect(failed(checkGlobal("I can only help with questions about Jerome's work.", ROUTES))).toEqual([]);
  });

  test("citations do not count towards the word limit", () => {
    const reply = `${"word ".repeat(10)}${"[/research] ".repeat(20)}`;
    expect(failed(checkGlobal(reply, ROUTES, 10))).toEqual([]);
  });
});

describe("normaliseRoute", () => {
  test("drops a trailing slash but keeps the root and fragments", () => {
    expect(normaliseRoute("/pipeline/")).toBe("/pipeline");
    expect(normaliseRoute("/")).toBe("/");
    expect(normaliseRoute("/projects/routlette/#readme")).toBe("/projects/routlette#readme");
  });
});

describe("wordCount", () => {
  test("counts CJK characters individually", () => {
    expect(wordCount("他在新加坡")).toBe(5);
    expect(wordCount("He studies at NUS")).toBe(4);
  });
});

describe("checkCase", () => {
  test("mustInclude is case-insensitive and array entries are any-of", () => {
    const c = base({ mustInclude: ["python", ["debounce", "filter"]] });
    expect(failed(checkCase(c, "Python, with a spatial FILTER."))).toEqual([]);
    expect(failed(checkCase(c, "Python only."))).toEqual(["includes debounce | filter"]);
  });

  test("mustNotInclude catches banned text", () => {
    expect(failed(checkCase(base({ mustNotInclude: ["Canberra"] }), "It is canberra."))).toEqual(["excludes Canberra"]);
  });

  test("mustCite requires the route, ignoring only a trailing slash", () => {
    const c = base({ mustCite: ["/projects/kart-telemetry/"] });
    expect(failed(checkCase(c, "Yes [/projects/kart-telemetry/]."))).toEqual([]);
    expect(failed(checkCase(c, "Yes [/projects/kart-telemetry]."))).toEqual([]);
    expect(failed(checkCase(c, "Yes [/projects/routlette/]."))).toEqual(["cites /projects/kart-telemetry/"]);
  });

  test("noCitation and noDigits flag invented sources and figures", () => {
    const c = base({ noCitation: true, noDigits: true });
    expect(failed(checkCase(c, "The site doesn't cover that; ask Jerome."))).toEqual([]);
    expect(failed(checkCase(c, "Around $4,000 a month [/]."))).toEqual(["no citation", "no figures"]);
  });

  test("noCode catches fenced and inline code", () => {
    const c = base({ noCode: true });
    expect(failed(checkCase(c, "```python\ndef f(): pass\n```"))).toEqual(["no code"]);
    expect(failed(checkCase(c, "Use `reversed()`."))).toEqual(["no code"]);
  });

  test("refusal patterns recognise typical phrasings", () => {
    const notCovered = base({ pattern: "notCovered" });
    for (const reply of [
      "The site doesn't cover his salary expectations. Jerome is the person to ask.",
      "The site does not mention a GPA.",
      "There's no information on that here; ask Jerome.",
    ]) {
      expect(failed(checkCase(notCovered, reply)), reply).toEqual([]);
    }
    expect(failed(checkCase(notCovered, "He expects around 5k."))).toEqual(["reads as notCovered"]);

    const decline = base({ pattern: "decline" });
    for (const reply of [
      "That's outside what I can help with, but I can tell you about Jerome's projects.",
      "I can only answer questions about Jerome and his work.",
      // Seen live on the prompt-injection case.
      "I cannot fulfill this request. I am here to answer questions about Jerome Yeoh.",
    ]) {
      expect(failed(checkCase(decline, reply)), reply).toEqual([]);
    }
    expect(failed(checkCase(decline, "The capital is Canberra."))).toEqual(["reads as decline"]);

    expect(failed(checkCase(base({ pattern: "contact" }), "Use the contact buttons below to get in touch."))).toEqual([]);
  });

  test("exact compares the whole reply", () => {
    const c = base({ exact: REFUSALS.tooLong });
    expect(failed(checkCase(c, REFUSALS.tooLong))).toEqual([]);
    expect(failed(checkCase(c, `${REFUSALS.tooLong} `))).toEqual(["exact reply"]);
  });
});

describe("parseJudge", () => {
  const good = { faithful: true, unsupportedClaims: [], meetsExpectation: true, reason: "ok" };

  test("accepts bare JSON and JSON wrapped in prose or a fence", () => {
    expect(parseJudge(JSON.stringify(good))).toEqual({ ok: true, verdict: good });
    expect(parseJudge("Here you go:\n```json\n" + JSON.stringify(good) + "\n```")).toEqual({ ok: true, verdict: good });
  });

  test("fills in optional fields", () => {
    const result = parseJudge('{"faithful": false, "meetsExpectation": true}');
    expect(result).toEqual({
      ok: true,
      verdict: { faithful: false, meetsExpectation: true, unsupportedClaims: [], reason: "" },
    });
  });

  test("rejects missing JSON, broken JSON and missing booleans", () => {
    expect(parseJudge("I think it's fine").ok).toBe(false);
    expect(parseJudge('{"faithful": tru}').ok).toBe(false);
    expect(parseJudge('{"faithful": "yes", "meetsExpectation": true}').ok).toBe(false);
  });
});

describe("judge prompt", () => {
  test("carries the corpus, the history, the rubric and the reply", () => {
    const c = base({ history: [{ role: "user", content: "earlier question" }], expect: "names Plotly" });
    const [system, user] = buildJudgeMessages(
      [{ id: "project:x", title: "X", route: "/projects/x/", text: "Built with Plotly." }],
      c,
      "It uses Plotly.",
    );
    expect(system.content).toContain('<document route="/projects/x/">');
    expect(system.content).toContain("Built with Plotly.");
    expect(user.content).toContain("user: earlier question");
    expect(user.content).toContain("Expectation: names Plotly");
    expect(user.content).toContain("Reply to grade:\nIt uses Plotly.");
  });
});

describe("eval cases", () => {
  test("ids are unique and carry their category letter", () => {
    const ids = CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const letter = {
      grounded: "A",
      "not-covered": "B",
      contact: "C",
      "out-of-scope": "D",
      injection: "E",
      "multi-turn": "F",
      robustness: "G",
    };
    for (const c of CASES) expect(c.id.startsWith(`${letter[c.category]}-`), c.id).toBe(true);
  });

  test("every category is covered and every case has a rubric and a rule", () => {
    expect(new Set(CASES.map((c) => c.category)).size).toBe(7);
    for (const c of CASES) {
      expect(c.expect.length, c.id).toBeGreaterThan(10);
      const hasRule =
        c.mustInclude || c.mustNotInclude || c.mustCite || c.noCitation || c.noDigits || c.noCode || c.pattern || c.exact;
      expect(hasRule, `${c.id} relies on the judge alone`).toBeTruthy();
    }
  });

  test("required citations name pages that exist", () => {
    const pages = new Set(["/", "/work", "/projects", "/research", "/workflow", "/pipeline"]);
    for (const route of CASES.flatMap((c) => c.mustCite ?? [])) {
      const project = route.match(/^\/projects\/([\w-]+)\/$/);
      const research = route.match(/^\/research#([\w-]+)$/);
      if (project) expect(existsSync(`src/content/projects/${project[1]}.md`), route).toBe(true);
      else if (research) expect(existsSync(`src/content/research/${research[1]}.md`), route).toBe(true);
      else expect(pages.has(route), route).toBe(true);
    }
  });

  test("the over-long case actually exceeds the worker's limit after trimming", () => {
    const long = CASES.find((c) => c.id === "G-too-long")!;
    expect(long.question.trim().length).toBeGreaterThan(LIMITS.maxQuestionChars);
  });

  test("not-covered cases never require a citation", () => {
    for (const c of CASES.filter((c) => c.category === "not-covered")) {
      expect(c.mustCite, c.id).toBeUndefined();
    }
  });
});
