import { z } from "zod";

export const previewSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("video"),
    assetPath: z.string(),
    posterPath: z.string(),
  }),
  z.object({
    kind: z.literal("animated-screenshot"),
    assetPath: z.string(),
    posterPath: z.string(),
  }),
]);

export const demoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("bundled"),
    localPath: z.string(),
  }),
  z.object({
    kind: z.literal("external"),
    url: z.url(),
  }),
  z.object({
    kind: z.literal("none"),
  }),
]);

export const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  stack: z.array(z.string()),
  flagship: z.boolean(),
  sortOrder: z.number().int(),
  preview: previewSchema,
  demo: demoSchema,
  repoUrl: z.url(),

  /* Facts panel. Optional until the copy lands — the panel renders only the
     rows that are present rather than showing empty labels. */
  role: z.string().optional(),
  timeline: z.string().optional(),
  status: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema>;
