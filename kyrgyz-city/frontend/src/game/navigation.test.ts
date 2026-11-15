import { describe, it, expect } from "vitest";
import { findPath, canWalk, obstacles } from "./navigation";
import locations from "../../../backend/content/locations.json";
import type { Location } from "../types";
const locs = locations as Location[],
  rects = obstacles(locs);
describe("walkable city", () => {
  it("blocks walls and map edges", () => {
    expect(canWalk(-31, 31, rects)).toBe(false);
    expect(canWalk(49, 0, rects)).toBe(false);
    expect(canWalk(-31, 40, rects)).toBe(true);
  });
  it("finds a collision-free route to all ten entrances", () => {
    for (const loc of locs) {
      const path = findPath([-31, 40], loc.entrance, rects);
      expect(path.length, loc.id).toBeGreaterThan(0);
      for (const point of path)
        expect(canWalk(...point, rects), loc.id).toBe(true);
      expect(path.at(-1)).toEqual(loc.entrance.map(Math.round));
    }
  });
  it("routes around buildings instead of crossing through them", () => {
    const path = findPath([-43, 31], [-20, 31], rects);
    expect(path.length).toBeGreaterThan(23);
    for (const point of path) expect(canWalk(...point, rects)).toBe(true);
  });
  it("rejects unreachable destinations", () => {
    expect(findPath([-31, 40], [-31, 31], rects)).toEqual([]);
  });
});
