/**
 * Behaviour for the calico cat that opens the chat. Everything here is pure so
 * it can be tested without a DOM; ChatWidget.astro owns the pointer events,
 * timers and styles, and asks this module what should happen next.
 */

export type CatState = "idle" | "nap" | "click" | "drag" | "fall";

export type CatEvent =
  | { type: "drag" }
  | { type: "drop" }
  | { type: "land" }
  | { type: "tap" }
  | { type: "danceEnd" }
  | { type: "idleTimeout"; nap: boolean };

/** Pointer travel, in px, that turns a press into a drag rather than a tap. */
export const DRAG_THRESHOLD = 5;

/** Two loops of the four-frame dance at 200ms a frame. */
export const DANCE_MS = 1600;
export const SQUASH_MS = 300;

/** The handoff adds 10px of velocity every 100ms tick, which is 1000px/s². */
export const GRAVITY = 1000;

/**
 * The state the cat moves to on an event. Events that make no sense for the
 * current state leave it where it is: a tap mid-air is the tail end of a drag,
 * not a request to dance. Nothing ends a nap on a timer: the cat sleeps until
 * it is tapped or picked up.
 */
export function nextState(state: CatState, event: CatEvent): CatState {
  switch (event.type) {
    case "drag":
      // A falling cat can be caught again.
      return "drag";
    case "drop":
      return state === "drag" ? "fall" : state;
    case "land":
      return state === "fall" ? "idle" : state;
    case "tap":
      return state === "drag" || state === "fall" ? state : "click";
    case "danceEnd":
      return state === "click" ? "idle" : state;
    case "idleTimeout":
      return state === "idle" && event.nap ? "nap" : state;
  }
}

export function exceedsDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) > DRAG_THRESHOLD;
}

/**
 * Where the cat's head is in its 100px box for each pose: x is the centre of
 * the head from the left, top the highest pixel of the cat from the top.
 * Measured from the strips at display scale. The cat sits left of centre
 * with its tail out to the right and naps lying down facing right, so a
 * bubble aimed at the middle of the box misses the head, and one parked on
 * the box's top edge floats well above a napping cat. The dance sways from
 * 38 to 62, so it takes the middle of the sway, and its highest frame.
 */
export const HEAD: Record<CatState, { x: number; top: number }> = {
  idle: { x: 33, top: 12 },
  nap: { x: 71, top: 46 },
  drag: { x: 34, top: 4 },
  fall: { x: 34, top: 4 },
  click: { x: 50, top: 4 },
};

/**
 * The open panel sits over the cat but does not follow its head, or the
 * whole window would jump when the dance ends and the cat sits back down.
 * It clears the higher of the two poses the cat holds beneath it.
 */
export const PANEL_HEAD_TOP = Math.min(HEAD.click.top, HEAD.idle.top);

/** How long the cat sits idle before it naps. */
export const IDLE_MS = 10_000;

/**
 * One step of the fall after release. Velocity is in px/s, dt in seconds.
 * The cat stops exactly on the ground rather than sinking past it on a long
 * frame.
 */
export function fallStep(
  y: number,
  velocity: number,
  dt: number,
  groundY: number,
): { y: number; velocity: number; landed: boolean } {
  const v = velocity + GRAVITY * dt;
  const next = y + v * dt;
  if (next >= groundY) return { y: groundY, velocity: 0, landed: true };
  return { y: next, velocity: v, landed: false };
}

/** The strip the cat may stand on: the floor's left and right bounds. */
export interface Floor {
  left: number;
  right: number;
}

export function clamp(value: number, min: number, max: number): number {
  // When the range is narrower than the thing being placed, pin to min so it
  // at least starts on screen.
  return Math.max(min, Math.min(value, max));
}

/**
 * Horizontal placement for something anchored to the cat (the chat panel, a
 * speech bubble). It lines up with whichever edge of the cat faces the middle
 * of the floor, so it opens into the page rather than off it, then is clamped
 * so it never leaves the floor.
 */
export function alignToCat(
  catX: number,
  catWidth: number,
  boxWidth: number,
  floor: Floor,
): { left: number; side: "left" | "right" } {
  const centre = catX + catWidth / 2;
  const side = centre < (floor.left + floor.right) / 2 ? "left" : "right";
  const left = side === "left" ? catX : catX + catWidth - boxWidth;
  return { left: clamp(left, floor.left, floor.right - boxWidth), side };
}

/**
 * Where the cat sits while dragged: hanging from the pointer by the scruff,
 * so the pointer is at its top centre, kept inside the viewport.
 */
export function dragPosition(
  pointerX: number,
  pointerY: number,
  catWidth: number,
  catHeight: number,
  floor: Floor,
  groundY: number,
): { x: number; y: number } {
  return {
    x: clamp(pointerX - catWidth / 2, floor.left, floor.right - catWidth),
    y: clamp(pointerY, 0, groundY - catHeight),
  };
}
