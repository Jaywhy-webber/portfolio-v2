import { describe, test, expect } from "vitest";
import {
  alignToCat,
  clamp,
  dragPosition,
  exceedsDragThreshold,
  fallStep,
  HEAD,
  hiddenBelow,
  IDLE_MS,
  nextState,
  PANEL_HEAD_TOP,
  type CatState,
} from "../src/lib/cat";

describe("nextState", () => {
  test("a tap dances from idle, and wakes a napping cat straight into it", () => {
    expect(nextState("idle", { type: "tap" })).toBe("click");
    expect(nextState("nap", { type: "tap" })).toBe("click");
    expect(nextState("click", { type: "tap" })).toBe("click");
  });

  test("a tap is ignored while the cat is held or falling", () => {
    expect(nextState("drag", { type: "tap" })).toBe("drag");
    expect(nextState("fall", { type: "tap" })).toBe("fall");
  });

  test("drag, drop and land run in order back to idle", () => {
    let state: CatState = "idle";
    state = nextState(state, { type: "drag" });
    expect(state).toBe("drag");
    state = nextState(state, { type: "drop" });
    expect(state).toBe("fall");
    state = nextState(state, { type: "land" });
    expect(state).toBe("idle");
  });

  test("the cat can be grabbed from any state, including mid-fall", () => {
    for (const state of ["idle", "nap", "click", "fall"] as const) {
      expect(nextState(state, { type: "drag" })).toBe("drag");
    }
  });

  test("drop and land only apply to the state they belong to", () => {
    expect(nextState("idle", { type: "drop" })).toBe("idle");
    expect(nextState("drag", { type: "land" })).toBe("drag");
  });

  test("the dance ends in idle", () => {
    expect(nextState("click", { type: "danceEnd" })).toBe("idle");
  });

  test("a nap lasts until the cat is touched", () => {
    // Timers keep firing on an untouched page; none of them wakes it.
    expect(nextState("nap", { type: "idleTimeout", nap: false })).toBe("nap");
    expect(nextState("nap", { type: "danceEnd" })).toBe("nap");
    expect(nextState("nap", { type: "land" })).toBe("nap");
    // Only a tap or a grab does.
    expect(nextState("nap", { type: "tap" })).toBe("click");
    expect(nextState("nap", { type: "drag" })).toBe("drag");
  });

  test("a stale timer does not override what happened since", () => {
    // The dance timer fires after the cat was picked up mid-dance.
    expect(nextState("drag", { type: "danceEnd" })).toBe("drag");
  });

  test("an idle timeout naps only when the roll says so, and only from idle", () => {
    expect(nextState("idle", { type: "idleTimeout", nap: true })).toBe("nap");
    expect(nextState("idle", { type: "idleTimeout", nap: false })).toBe("idle");
    expect(nextState("click", { type: "idleTimeout", nap: true })).toBe("click");
  });
});

describe("exceedsDragThreshold", () => {
  test("small jitter is still a tap", () => {
    expect(exceedsDragThreshold(0, 0)).toBe(false);
    expect(exceedsDragThreshold(3, 4)).toBe(false); // exactly 5px
  });

  test("past 5px in any direction is a drag", () => {
    expect(exceedsDragThreshold(6, 0)).toBe(true);
    expect(exceedsDragThreshold(-4, -4)).toBe(true);
  });
});

describe("HEAD", () => {
  test("every pose has a head for bubbles to sit on, inside the box", () => {
    for (const state of ["idle", "nap", "click", "drag", "fall"] as const) {
      expect(HEAD[state].x, state).toBeGreaterThan(0);
      expect(HEAD[state].x, state).toBeLessThan(100);
      expect(HEAD[state].top, state).toBeGreaterThanOrEqual(0);
      expect(HEAD[state].top, state).toBeLessThan(100);
    }
  });

  test("the sitting cat's head is left of centre, the napping cat's right of it", () => {
    // The reason tails can't simply aim at the middle of the box.
    expect(HEAD.idle.x).toBeLessThan(50);
    expect(HEAD.nap.x).toBeGreaterThan(50);
  });

  test("a napping cat is far lower than a sitting one", () => {
    // The reason bubbles can't simply sit on the top edge of the box.
    expect(HEAD.nap.top - HEAD.idle.top).toBeGreaterThan(30);
  });

  test("the panel clears the cat both dancing and sitting, so it never has to move", () => {
    expect(PANEL_HEAD_TOP).toBeLessThanOrEqual(HEAD.click.top);
    expect(PANEL_HEAD_TOP).toBeLessThanOrEqual(HEAD.idle.top);
  });
});

describe("idle timing", () => {
  test("the cat naps after ten seconds idle", () => {
    expect(IDLE_MS).toBe(10_000);
  });
});

describe("fallStep", () => {
  test("accelerates while in the air", () => {
    const first = fallStep(0, 0, 0.1, 1000);
    expect(first).toEqual({ y: 10, velocity: 100, landed: false });
    const second = fallStep(first.y, first.velocity, 0.1, 1000);
    expect(second.velocity).toBe(200);
    expect(second.y).toBe(30);
  });

  test("stops exactly on the ground instead of sinking through it", () => {
    expect(fallStep(995, 500, 0.1, 1000)).toEqual({ y: 1000, velocity: 0, landed: true });
  });

  test("a cat dropped on the ground lands at once", () => {
    expect(fallStep(1000, 0, 0.016, 1000).landed).toBe(true);
  });
});

describe("hiddenBelow", () => {
  test("nothing is hidden when the visible area fills the layout", () => {
    expect(hiddenBelow(844, 844, 0)).toBe(0);
  });

  test("Chrome: the keyboard shrinks only the visible area, so its height is hidden", () => {
    expect(hiddenBelow(844, 508, 0)).toBe(336);
  });

  test("iOS Safari: the layout shrinks with it, so nothing is hidden below", () => {
    // Seen on an iPhone: measuring for a keyboard here found none, and the
    // panel rode up with the cat to the top half of the screen.
    expect(hiddenBelow(508, 508, 0)).toBe(0);
  });

  test("accounts for the page having scrolled under the keyboard", () => {
    expect(hiddenBelow(844, 508, 120)).toBe(216);
  });

  test("never negative", () => {
    expect(hiddenBelow(508, 508, 30)).toBe(0);
  });
});

describe("placement", () => {
  const floor = { left: 20, right: 1260 };

  test("clamp pins to min when the range is narrower than the box", () => {
    expect(clamp(50, 20, 10)).toBe(20);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  test("a cat on the right opens things leftward from its right edge", () => {
    // Home position: hugging the right of the floor.
    expect(alignToCat(1160, 100, 368, floor)).toEqual({ left: 892, side: "right" });
  });

  test("a cat on the left opens things rightward from its left edge", () => {
    expect(alignToCat(100, 100, 368, floor)).toEqual({ left: 100, side: "left" });
  });

  test("a box wider than the room beside the cat is kept on the floor", () => {
    const narrow = { left: 16, right: 374 };
    // Cat at the far left of a phone, panel wider than the remaining space.
    expect(alignToCat(16, 100, 340, narrow).left).toBe(16);
    // Cat at the far right.
    expect(alignToCat(274, 100, 340, narrow).left).toBe(34);
  });

  test("the dragged cat hangs from the pointer by its top centre", () => {
    expect(dragPosition(600, 300, 100, 100, floor, 900)).toEqual({ x: 550, y: 300 });
  });

  test("the dragged cat cannot leave the viewport or sink below the ground", () => {
    expect(dragPosition(0, -50, 100, 100, floor, 900)).toEqual({ x: 20, y: 0 });
    expect(dragPosition(5000, 5000, 100, 100, floor, 900)).toEqual({ x: 1160, y: 800 });
  });
});
