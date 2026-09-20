import type { z } from "zod";
import type { demoSchema } from "../schemas/projects";

type DemoInput = z.infer<typeof demoSchema>;

export interface DemoTarget {
  /** URL loaded into the overlay iframe and by "Open in new tab". */
  src: string;
  /** Shown in the overlay chrome. */
  title: string;
  /** True when the demo is hosted elsewhere, not bundled in this deployment. */
  external: boolean;
}

/**
 * Directory-style demo paths resolve to their index.html on a static host but
 * 404 on Astro's dev server, which serves `public/` without directory indexes.
 * Naming the file explicitly works in both.
 */
function resolveBundledPath(localPath: string): string {
  return localPath.endsWith("/") ? `${localPath}index.html` : localPath;
}

/**
 * The overlay target for a project, or null when it has no demo.
 * Projects with `demo.kind === "none"` must not render a Live demo trigger.
 */
export function demoTargetFor(project: { title: string; demo: DemoInput }): DemoTarget | null {
  const { demo, title } = project;

  if (demo.kind === "bundled") {
    return { src: resolveBundledPath(demo.localPath), title, external: false };
  }

  if (demo.kind === "external") {
    return { src: demo.url, title, external: true };
  }

  return null;
}
