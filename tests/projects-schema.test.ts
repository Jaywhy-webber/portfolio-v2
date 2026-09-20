import { describe, test, expect } from "vitest";
import { projectSchema } from "../src/schemas/projects";

const validEntry = {
  title: "Test Project",
  summary: "A one-line summary of the project.",
  stack: ["TypeScript", "Astro"],
  sortOrder: 1,
  preview: {
    kind: "video" as const,
    assetPath: "/assets/previews/test.webm",
    posterPath: "/assets/posters/test.webp",
  },
  demo: {
    kind: "bundled" as const,
    localPath: "/demos/test/",
  },
  repoUrl: "https://github.com/user/repo",
};

describe("project schema", () => {
  test("accepts a valid entry with all fields", () => {
    const result = projectSchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  test("rejects entry missing title", () => {
    const { title, ...rest } = validEntry;
    const result = projectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects entry missing summary", () => {
    const { summary, ...rest } = validEntry;
    const result = projectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects entry missing stack", () => {
    const { stack, ...rest } = validEntry;
    const result = projectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects entry with non-array stack", () => {
    const result = projectSchema.safeParse({ ...validEntry, stack: "TypeScript" });
    expect(result.success).toBe(false);
  });

  test("rejects entry missing sortOrder", () => {
    const { sortOrder, ...rest } = validEntry;
    const result = projectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects non-integer sortOrder", () => {
    const result = projectSchema.safeParse({ ...validEntry, sortOrder: 1.5 });
    expect(result.success).toBe(false);
  });

  test("rejects entry missing preview", () => {
    const { preview, ...rest } = validEntry;
    const result = projectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects preview with invalid kind", () => {
    const result = projectSchema.safeParse({
      ...validEntry,
      preview: { kind: "gif", assetPath: "/x.gif", posterPath: "/x.webp" },
    });
    expect(result.success).toBe(false);
  });

  test("accepts animated-screenshot preview", () => {
    const result = projectSchema.safeParse({
      ...validEntry,
      preview: {
        kind: "animated-screenshot",
        assetPath: "/assets/previews/test.webp",
        posterPath: "/assets/posters/test.webp",
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects entry missing demo", () => {
    const { demo, ...rest } = validEntry;
    const result = projectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("accepts external demo", () => {
    const result = projectSchema.safeParse({
      ...validEntry,
      demo: { kind: "external", url: "https://example.com/dashboard" },
    });
    expect(result.success).toBe(true);
  });

  test("accepts none demo", () => {
    const result = projectSchema.safeParse({
      ...validEntry,
      demo: { kind: "none" },
    });
    expect(result.success).toBe(true);
  });

  test("rejects external demo with invalid url", () => {
    const result = projectSchema.safeParse({
      ...validEntry,
      demo: { kind: "external", url: "not-a-url" },
    });
    expect(result.success).toBe(false);
  });

  test("rejects entry missing repoUrl", () => {
    const { repoUrl, ...rest } = validEntry;
    const result = projectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects entry with invalid repoUrl", () => {
    const result = projectSchema.safeParse({ ...validEntry, repoUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });
});
