import type { Project } from "../schemas/projects";

interface OrderableProject {
  data: Pick<Project, "sortOrder">;
}

/**
 * Display order comes from sortOrder alone, so the list is whatever the author
 * numbered it. Flagship no longer floats projects to the top: it describes what
 * a project ships (a bundled interactive artifact), not how prominent it is.
 */
export function sortProjects<T extends OrderableProject>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.sortOrder - b.data.sortOrder);
}

/** Zero-padded row index: 1 -> "01". */
export function indexLabel(position: number): string {
  return String(position).padStart(2, "0");
}

/** Wraps a path with spaces (e.g. slide directories) into a safe URL. */
export function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
