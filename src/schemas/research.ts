import { z } from "zod";

/**
 * How an entry's slides are shown in the 16:9 stage.
 * - images: self-hosted numbered slides, with thumbnail strip and counter
 * - embed:  a deck we only have as a binary, shown through a viewer service
 */
export const researchViewerSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("images"),
    /** Directory under /public, e.g. "/research/beijing prop mkt/". */
    basePath: z.string(),
    /** Filenames in display order. */
    slides: z.array(z.string()).min(1),
  }),
  z.object({
    kind: z.literal("embed"),
    provider: z.literal("office"),
    /** Path under /public to the deck, e.g. "/research/databusters.pptx". */
    filePath: z.string(),
  }),
]);

export const researchSchema = z.object({
  title: z.string(),
  year: z.string(),
  tags: z.array(z.string()).default([]),
  /** Path under /public for the Download slides action. Omit to hide it. */
  slidesUrl: z.string().optional(),
  viewer: researchViewerSchema,
  sortOrder: z.number().int(),
});

export type Research = z.infer<typeof researchSchema>;
