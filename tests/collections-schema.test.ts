import { describe, test, expect } from "vitest";
import { experienceSchema } from "../src/schemas/experience";
import { researchSchema, researchViewerSchema } from "../src/schemas/research";
import { projectSchema } from "../src/schemas/projects";

const validExperience = {
  dateRange: "2024 — 2025",
  title: "Data Analyst Intern",
  org: "Some Organisation",
  sortOrder: 1,
};

describe("experienceSchema", () => {
  test("accepts a minimal entry and defaults the list fields", () => {
    const parsed = experienceSchema.parse(validExperience);
    expect(parsed.tags).toEqual([]);
    expect(parsed.relatedProjects).toEqual([]);
    expect(parsed.dateNote).toBeUndefined();
  });

  test("requires a sortOrder so /work ordering is deterministic", () => {
    const { sortOrder, ...withoutOrder } = validExperience;
    expect(() => experienceSchema.parse(withoutOrder)).toThrow();
  });
});

describe("researchViewerSchema", () => {
  test("accepts an image viewer with at least one slide", () => {
    const parsed = researchViewerSchema.parse({
      kind: "images",
      basePath: "/research/deck/",
      slides: ["Title.png", "2.png"],
    });
    expect(parsed).toMatchObject({ kind: "images", slides: ["Title.png", "2.png"] });
  });

  test("rejects an image viewer with no slides", () => {
    expect(() =>
      researchViewerSchema.parse({ kind: "images", basePath: "/x/", slides: [] }),
    ).toThrow();
  });

  test("accepts the office embed viewer", () => {
    const parsed = researchViewerSchema.parse({
      kind: "embed",
      provider: "office",
      filePath: "/research/databusters.pptx",
    });
    expect(parsed).toMatchObject({ kind: "embed", provider: "office" });
  });

  test("rejects an unknown viewer kind", () => {
    expect(() => researchViewerSchema.parse({ kind: "pdf", filePath: "/x.pdf" })).toThrow();
  });
});

describe("researchSchema", () => {
  test("slidesUrl is optional so an entry without a downloadable deck still parses", () => {
    const parsed = researchSchema.parse({
      title: "Beijing Property Market Analysis",
      year: "2026",
      viewer: { kind: "images", basePath: "/x/", slides: ["1.png"] },
      sortOrder: 2,
    });
    expect(parsed.slidesUrl).toBeUndefined();
    expect(parsed.tags).toEqual([]);
  });
});

describe("projectSchema facts fields", () => {
  const base = {
    title: "Kart Telemetry Dashboard",
    summary: "Turns raw sensor logs into lap insights.",
    stack: ["Python"],
    sortOrder: 1,
    preview: { kind: "video", assetPath: "/a.webm", posterPath: "/a.png" },
    demo: { kind: "bundled", localPath: "/demos/kart-telemetry/" },
    repoUrl: "https://github.com/Jaywhy-webber/kart-telemetry",
  };

  test("parses without role, timeline or status", () => {
    const parsed = projectSchema.parse(base);
    expect(parsed.role).toBeUndefined();
    expect(parsed.timeline).toBeUndefined();
    expect(parsed.status).toBeUndefined();
  });

  test("carries the facts fields through when present", () => {
    const parsed = projectSchema.parse({
      ...base,
      role: "Solo build",
      timeline: "2025",
      status: "Shipped",
    });
    expect(parsed).toMatchObject({ role: "Solo build", timeline: "2025", status: "Shipped" });
  });
});
