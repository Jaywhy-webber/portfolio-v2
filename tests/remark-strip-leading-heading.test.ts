import { describe, test, expect } from "vitest";
import type { Root, Heading, Paragraph } from "mdast";
import { remarkStripLeadingHeading } from "../src/lib/remark-strip-leading-heading";

function heading(depth: 1 | 2, text: string): Heading {
  return { type: "heading", depth, children: [{ type: "text", value: text }] };
}

function paragraph(text: string): Paragraph {
  return { type: "paragraph", children: [{ type: "text", value: text }] };
}

describe("remarkStripLeadingHeading", () => {
  test("removes a leading H1", () => {
    const tree: Root = { type: "root", children: [heading(1, "Title"), paragraph("Body")] };
    remarkStripLeadingHeading()(tree);
    expect(tree.children).toEqual([paragraph("Body")]);
  });

  test("leaves a leading H2 untouched", () => {
    const tree: Root = { type: "root", children: [heading(2, "Subtitle"), paragraph("Body")] };
    remarkStripLeadingHeading()(tree);
    expect(tree.children).toEqual([heading(2, "Subtitle"), paragraph("Body")]);
  });

  test("leaves a leading paragraph untouched", () => {
    const tree: Root = { type: "root", children: [paragraph("Body"), heading(1, "Title")] };
    remarkStripLeadingHeading()(tree);
    expect(tree.children).toEqual([paragraph("Body"), heading(1, "Title")]);
  });

  test("does not crash on an empty tree", () => {
    const tree: Root = { type: "root", children: [] };
    expect(() => remarkStripLeadingHeading()(tree)).not.toThrow();
    expect(tree.children).toEqual([]);
  });

  test("only strips the first H1, not a later one", () => {
    const tree: Root = { type: "root", children: [heading(1, "Title"), heading(1, "Another H1")] };
    remarkStripLeadingHeading()(tree);
    expect(tree.children).toEqual([heading(1, "Another H1")]);
  });
});
