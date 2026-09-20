import type { z } from "zod";
import type { previewSchema } from "../schemas/projects";

type PreviewInput = z.infer<typeof previewSchema>;

export type ResolvedVideo = {
  kind: "video";
  sources: { src: string; type: string }[];
  poster: string;
};

export type ResolvedAnimatedScreenshot = {
  kind: "animated-screenshot";
  staticSrc: string;
  animatedSrc: string;
};

export type ResolvedPreview = ResolvedVideo | ResolvedAnimatedScreenshot;

function mimeForExtension(path: string): string {
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mp4")) return "video/mp4";
  return "video/mp4";
}

export function resolvePreview(preview: PreviewInput): ResolvedPreview {
  if (preview.kind === "video") {
    const primary = { src: preview.assetPath, type: mimeForExtension(preview.assetPath) };
    const sources = [primary];
    if (preview.assetPath.endsWith(".webm")) {
      sources.push({
        src: preview.assetPath.replace(/\.webm$/, ".mp4"),
        type: "video/mp4",
      });
    }
    return { kind: "video", sources, poster: preview.posterPath };
  }

  return {
    kind: "animated-screenshot",
    staticSrc: preview.posterPath,
    animatedSrc: preview.assetPath,
  };
}
