/** One node on a zig-zag pipeline diagram. */
export interface PipelineStep {
  /** Short label under/above the node. */
  label: string;
  /** One-sentence description. `code` spans are written as `backticks`. */
  description: string;
}
