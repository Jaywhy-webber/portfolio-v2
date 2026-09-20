import { describe, test, expect } from "vitest";
import { resolvePreview } from "../src/lib/preview";

describe("resolvePreview", () => {
  test("video kind returns WebM source with MP4 fallback", () => {
    const result = resolvePreview({
      kind: "video",
      assetPath: "/assets/previews/kart-telemetry.webm",
      posterPath: "/assets/posters/kart-telemetry.png",
    });
    expect(result).toEqual({
      kind: "video",
      sources: [
        { src: "/assets/previews/kart-telemetry.webm", type: "video/webm" },
        { src: "/assets/previews/kart-telemetry.mp4", type: "video/mp4" },
      ],
      poster: "/assets/posters/kart-telemetry.png",
    });
  });

  test("video kind with non-webm asset does not produce a duplicate fallback", () => {
    const result = resolvePreview({
      kind: "video",
      assetPath: "/assets/previews/demo.mp4",
      posterPath: "/assets/posters/demo.png",
    });
    expect(result.kind).toBe("video");
    if (result.kind === "video") {
      expect(result.sources).toEqual([
        { src: "/assets/previews/demo.mp4", type: "video/mp4" },
      ]);
    }
  });

  test("animated-screenshot kind returns static and animated sources", () => {
    const result = resolvePreview({
      kind: "animated-screenshot",
      assetPath: "/assets/previews/tamagotchis-of-nus.gif",
      posterPath: "/assets/posters/tamagotchis-of-nus.png",
    });
    expect(result).toEqual({
      kind: "animated-screenshot",
      staticSrc: "/assets/posters/tamagotchis-of-nus.png",
      animatedSrc: "/assets/previews/tamagotchis-of-nus.gif",
    });
  });

  test("video kind always includes the poster path", () => {
    const result = resolvePreview({
      kind: "video",
      assetPath: "/assets/previews/test.webm",
      posterPath: "/assets/posters/test.jpg",
    });
    if (result.kind === "video") {
      expect(result.poster).toBe("/assets/posters/test.jpg");
    }
  });
});
