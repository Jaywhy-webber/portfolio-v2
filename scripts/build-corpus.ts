/**
 * Builds the chatbot's corpus from the site's own content.
 *
 * Output is a generated `worker/corpus.ts` — a flat array of documents, each
 * carrying the route it came from so answers can cite a real page. Kept as
 * discrete documents rather than one blob so a selection step can be added
 * later if the corpus outgrows a single request.
 *
 * Run: npx tsx scripts/build-corpus.ts
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface CorpusDoc {
  /** Stable identifier, e.g. "project:kart-telemetry". */
  id: string;
  /** Human title shown in a citation. */
  title: string;
  /** Route on the site this came from, or null if it isn't a page. */
  route: string | null;
  text: string;
}

const CONTENT = "src/content";

/** Splits YAML front matter off a markdown file. Returns [frontMatter, body]. */
function splitFrontMatter(raw: string): [string, string] {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return ["", raw];
  return [match[1], match[2]];
}

/** Reads one scalar or inline-list value out of front matter. Good enough for our shapes. */
function field(frontMatter: string, key: string): string {
  const line = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!line) return "";
  return line[1].trim().replace(/^["']|["']$/g, "");
}

/** Reads a YAML block list (`key:` followed by indented `- item` lines). */
function listField(frontMatter: string, key: string): string[] {
  const block = frontMatter.match(new RegExp(`^${key}:\\s*\\n((?:\\s+- .*\\n?)+)`, "m"));
  if (!block) {
    const inline = field(frontMatter, key);
    if (inline.startsWith("[")) {
      return inline
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }
  return block[1]
    .split("\n")
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function readDir(dir: string): { id: string; raw: string }[] {
  const path = join(CONTENT, dir);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ id: f.replace(/\.md$/, ""), raw: readFileSync(join(path, f), "utf-8") }));
}

function buildProjects(): CorpusDoc[] {
  return readDir("projects").map(({ id, raw }) => {
    const [fm, body] = splitFrontMatter(raw);
    const title = field(fm, "title");
    const stack = listField(fm, "stack");

    const facts = [
      `Stack: ${stack.join(", ")}`,
      field(fm, "role") && `Role: ${field(fm, "role")}`,
      field(fm, "timeline") && `Timeline: ${field(fm, "timeline")}`,
      field(fm, "status") && `Status: ${field(fm, "status")}`,
      `Repository: ${field(fm, "repoUrl")}`,
    ].filter(Boolean);

    return {
      id: `project:${id}`,
      title,
      route: `/projects/${id}/`,
      text: [
        `# Project: ${title}`,
        field(fm, "summary"),
        facts.join("\n"),
        body.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  });
}

function buildReadmes(): CorpusDoc[] {
  return readDir("readmes").map(({ id, raw }) => {
    const [, body] = splitFrontMatter(raw);
    return {
      id: `readme:${id}`,
      title: `${id} README`,
      // The readme is a tab on the project page, not its own route.
      route: `/projects/${id}/#readme`,
      text: `# README for the ${id} project\n\n${body.trim()}`,
    };
  });
}

function buildResearch(): CorpusDoc[] {
  return readDir("research").map(({ id, raw }) => {
    const [fm, body] = splitFrontMatter(raw);
    const title = field(fm, "title");
    return {
      id: `research:${id}`,
      title,
      // Each paper has its own anchor on the shared page. With one route for
      // both, the model invented per-paper paths that 404.
      route: `/research#${id}`,
      text: [
        `# Research: ${title} (${field(fm, "year")})`,
        `Topics: ${listField(fm, "tags").join(", ")}`,
        body.trim(),
      ].join("\n\n"),
    };
  });
}

function buildExperience(): CorpusDoc[] {
  return readDir("experience").map(({ id, raw }) => {
    const [fm, body] = splitFrontMatter(raw);
    const title = field(fm, "title");
    const org = field(fm, "org");
    return {
      id: `experience:${id}`,
      title: `${title} — ${org}`,
      route: "/work",
      text: [
        `# Experience: ${title} at ${org}`,
        `Dates: ${field(fm, "dateRange")}${field(fm, "dateNote") ? ` (${field(fm, "dateNote")})` : ""}`,
        listField(fm, "tags").length ? `Skills: ${listField(fm, "tags").join(", ")}` : "",
        body.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  });
}

/**
 * The two process diagrams. Read from the compiled step arrays rather than
 * re-parsing the TypeScript, so the corpus cannot drift from what renders.
 */
async function buildProcesses(): Promise<CorpusDoc[]> {
  const workflow = await import("../src/data/workflow.ts");
  const pipeline = await import("../src/data/pipeline.ts");

  const render = (steps: { label: string; description: string }[]) =>
    steps.map((s, i) => `${i + 1}. ${s.label} — ${s.description.replace(/`/g, "")}`).join("\n");

  return [
    {
      id: "process:workflow",
      title: "Agentic workflow",
      route: "/workflow",
      text: [
        "# The agentic coding workflow Jerome uses",
        workflow.workflowIntro,
        render(workflow.workflowSteps),
        `Repository: ${workflow.workflowRepoUrl}`,
      ].join("\n\n"),
    },
    {
      id: "process:pipeline",
      title: "Data cleaning pipeline",
      route: "/pipeline",
      text: [
        "# The data cleaning pipeline project",
        pipeline.pipelineIntro,
        render(pipeline.pipelineSteps),
        pipeline.pipelineSampleOutput ? `Sample output:\n${pipeline.pipelineSampleOutput}` : "",
        `Repository: ${pipeline.pipelineRepoUrl}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}

/**
 * Facts about Jerome that live in page markup rather than a content
 * collection, so the bot can answer "who is he" without guessing.
 */
function buildProfile(): CorpusDoc {
  return {
    id: "profile:about",
    // Not "About Jerome Yeoh": from that title the model derived a route of
    // "/about", which does not exist. The profile lives on the home page.
    title: "Jerome Yeoh: profile (home page)",
    route: "/",
    text: `# Jerome Yeoh: profile (home page)

Jerome Yeoh is a Business Analytics student at the National University of
Singapore, reading a Bachelor of Science in Business Analytics with a second
major in Economics, on the Special Programme in Undergraduate Research. He is
a Merit Scholar with a GPA of 4.63 out of 5.0, and expects to graduate in
July 2029. His work centres on data and AI.

He is currently an Analyst Intern in Strategic Planning at the Public Service
Division, Prime Minister's Office. Full role history is on the work page.

Contact and links:
- Email: jeromeyeohhc@gmail.com
- GitHub: https://github.com/Jaywhy-webber
- LinkedIn: https://www.linkedin.com/in/jerome-yeoh-35a738217
- Résumé: available to download from the site at /resume.pdf

This site has pages for his work history (/work), projects (/projects),
research (/research), the agentic coding workflow he uses (/workflow) and a
data cleaning pipeline project (/pipeline).`,
  };
}

async function main() {
  const docs: CorpusDoc[] = [
    buildProfile(),
    ...buildProjects(),
    ...buildExperience(),
    ...buildResearch(),
    ...(await buildProcesses()),
    ...buildReadmes(),
  ];

  const chars = docs.reduce((n, d) => n + d.text.length, 0);

  mkdirSync("worker", { recursive: true });
  writeFileSync(
    "worker/corpus.ts",
    `// GENERATED by scripts/build-corpus.ts — do not edit.
// ${docs.length} documents, ${chars} characters (~${Math.round(chars / 4)} tokens).
import type { CorpusDoc } from "./types";

export const CORPUS: CorpusDoc[] = ${JSON.stringify(docs, null, 2)};
`,
    "utf-8",
  );

  console.log(`corpus: ${docs.length} docs, ${chars} chars (~${Math.round(chars / 4)} tokens)`);
  for (const d of docs) console.log(`  ${d.id.padEnd(34)} ${String(d.text.length).padStart(6)} chars`);
}

main();
