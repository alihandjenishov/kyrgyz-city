import type { Location } from "../types";
export type Point = [number, number];
export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}
export function obstacles(locations: Location[]): Rect[] {
  return locations
    .filter((l) => l.kind !== "park" && l.kind !== "bus")
    .map((l) => ({
      x: l.position[0],
      z: l.position[1],
      w: l.size[0] + 1,
      d: l.size[1] + 1,
    }));
}
export function canWalk(x: number, z: number, rects: Rect[], limit = 48) {
  return (
    Math.abs(x) <= limit &&
    Math.abs(z) <= limit &&
    !rects.some(
      (r) =>
        Math.abs(x - r.x) < r.w / 2 + 0.35 &&
        Math.abs(z - r.z) < r.d / 2 + 0.35,
    )
  );
}
export function findPath(start: Point, end: Point, rects: Rect[]): Point[] {
  const goal: Point = [Math.round(end[0]), Math.round(end[1])],
    s: Point = [Math.round(start[0]), Math.round(start[1])];
  if (!canWalk(...goal, rects)) return [];
  const key = (p: Point) => p.join(",");
  const sk = key(s),
    gk = key(goal);
  if (sk === gk) return [goal];
  const open = [s];
  const costs = new Map([[sk, 0]]),
    from = new Map<string, string>();
  const closed = new Set<string>();
  const h = (p: Point) => Math.abs(p[0] - goal[0]) + Math.abs(p[1] - goal[1]);
  while (open.length) {
    open.sort(
      (a, b) => costs.get(key(a))! + h(a) - (costs.get(key(b))! + h(b)),
    );
    const p = open.shift()!,
      pk = key(p);
    if (pk === gk) {
      const path: Point[] = [];
      let k = gk;
      while (k !== sk) {
        path.unshift(k.split(",").map(Number) as Point);
        k = from.get(k)!;
      }
      return path;
    }
    closed.add(pk);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n: Point = [p[0] + dx, p[1] + dz],
        nk = key(n),
        cost = costs.get(pk)! + 1;
      if (closed.has(nk) || !canWalk(...n, rects)) continue;
      if (cost < (costs.get(nk) ?? Infinity)) {
        from.set(nk, pk);
        costs.set(nk, cost);
        if (!open.some((o) => key(o) === nk)) open.push(n);
      }
    }
  }
  return [];
}
