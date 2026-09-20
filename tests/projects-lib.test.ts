import { describe, test, expect } from "vitest";
import { sortProjects, indexLabel, encodePath } from "../src/lib/projects";

function entry(id: string, sortOrder: number) {
  return { id, data: { sortOrder } };
}

describe("sortProjects", () => {
  test("orders purely by sortOrder", () => {
    const sorted = sortProjects([
      entry("briefing", 3),
      entry("kart", 2),
      entry("ec1101", 4),
      entry("routlette", 1),
    ]);

    expect(sorted.map((e) => e.id)).toEqual(["routlette", "kart", "briefing", "ec1101"]);
  });

  test("a project with no demo can still sit first", () => {
    // Routlette has no bundled demo. Ordering is sortOrder alone, so nothing
    // about what a project ships can override where the author put it.
    const sorted = sortProjects([entry("kart", 2), entry("routlette", 1)]);
    expect(sorted[0].id).toBe("routlette");
  });

  test("does not mutate the input array", () => {
    const input = [entry("b", 2), entry("a", 1)];
    const copy = [...input];
    sortProjects(input);
    expect(input).toEqual(copy);
  });
});

describe("indexLabel", () => {
  test("zero-pads single digits", () => {
    expect(indexLabel(1)).toBe("01");
    expect(indexLabel(9)).toBe("09");
  });

  test("leaves two or more digits alone", () => {
    expect(indexLabel(10)).toBe("10");
    expect(indexLabel(123)).toBe("123");
  });
});

describe("encodePath", () => {
  test("encodes spaces without touching separators", () => {
    expect(encodePath("/research/beijing prop mkt/Title.png")).toBe(
      "/research/beijing%20prop%20mkt/Title.png",
    );
  });

  test("leaves already-safe paths unchanged", () => {
    expect(encodePath("/research/databusters.pptx")).toBe("/research/databusters.pptx");
  });
});
