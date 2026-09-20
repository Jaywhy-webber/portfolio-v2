import type { Root } from "mdast";

export function remarkStripLeadingHeading() {
  return (tree: Root) => {
    const [first] = tree.children;
    if (first?.type === "heading" && first.depth === 1) {
      tree.children.shift();
    }
  };
}
