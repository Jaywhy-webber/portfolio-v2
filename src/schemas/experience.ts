import { z } from "zod";

/**
 * One row on /work — a role or an education entry, not a build.
 * The two are not distinguished structurally: /work renders one flat
 * chronological list, and `dateNote` carries the distinction as free text
 * ("Internship", "BSc") where it is actually visible.
 */
export const experienceSchema = z.object({
  /** Left column, e.g. "2024 — 2025". */
  dateRange: z.string(),
  /** Secondary line under the date, e.g. "Internship" or "Full-time". */
  dateNote: z.string().optional(),
  title: z.string(),
  org: z.string(),
  tags: z.array(z.string()).default([]),
  /** Project collection ids this entry produced or relates to. */
  relatedProjects: z.array(z.string()).default([]),
  sortOrder: z.number().int(),
});

export type Experience = z.infer<typeof experienceSchema>;
