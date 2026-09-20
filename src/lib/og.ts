const DEFAULT_OG_IMAGE = "/assets/og-default.png";

export function resolveOgImage(posterPath?: string): string {
  if (posterPath && posterPath.trim().length > 0) {
    return posterPath;
  }
  return DEFAULT_OG_IMAGE;
}

export function buildOgImageUrl(site: string, imagePath: string): string {
  const base = site.replace(/\/+$/, "");
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${base}${path}`;
}
