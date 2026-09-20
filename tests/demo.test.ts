import { describe, test, expect } from "vitest";
import { demoTargetFor } from "../src/lib/demo";

describe("demoTargetFor", () => {
  test("a directory-style bundled path resolves to its index.html", () => {
    const target = demoTargetFor({
      title: "Kart Telemetry Dashboard",
      demo: { kind: "bundled", localPath: "/demos/kart-telemetry/" },
    });

    // The bare directory 404s on Astro's dev server; naming the file works
    // both locally and on the static host.
    expect(target).toEqual({
      src: "/demos/kart-telemetry/index.html",
      title: "Kart Telemetry Dashboard",
      external: false,
    });
  });

  test("a bundled path that already names a file is left alone", () => {
    const target = demoTargetFor({
      title: "Kart Telemetry Dashboard",
      demo: { kind: "bundled", localPath: "/demos/kart-telemetry/dashboard.html" },
    });

    expect(target?.src).toBe("/demos/kart-telemetry/dashboard.html");
  });

  test("external demos resolve to the URL and are flagged external", () => {
    const target = demoTargetFor({
      title: "Daily Briefing",
      demo: { kind: "external", url: "https://example.com/dashboard" },
    });

    expect(target).toEqual({
      src: "https://example.com/dashboard",
      title: "Daily Briefing",
      external: true,
    });
  });

  test("projects without a demo get no target, so no trigger is rendered", () => {
    expect(demoTargetFor({ title: "Routlette", demo: { kind: "none" } })).toBeNull();
  });
});
