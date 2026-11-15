import { describe, it, expect } from "vitest";
import {
  initialProgress,
  restore,
  scheduleReview,
  rewardOnce,
  applyEvent,
} from "./progress";
import quests from "../../../backend/content/quests.json";
import type { Quest } from "../types";
describe("local progress and fair rewards", () => {
  it("restores a saved character and learning history", () => {
    const p = {
      ...initialProgress(),
      name: "Өрүк",
      xp: 55,
      learned: ["home-3"],
      position: [-31, 40],
      lang: "en",
    };
    expect(restore(JSON.stringify(p))).toMatchObject(p);
  });
  it("recovers from corrupt and invalid saved data", () => {
    expect(restore("{bad")).toEqual(initialProgress());
    const p = restore(
      JSON.stringify({
        version: 1,
        xp: -90,
        position: [Infinity, 9],
        name: 42,
        learned: ["home-3", null, 6],
        reviews: { a: { due: "bad" } },
      }),
    );
    expect(p.xp).toBe(0);
    expect(p.position).toEqual([-31, 40]);
    expect(p.learned).toEqual(["home-3"]);
    expect(p.reviews).toEqual({});
  });
  it("awards each learning reward once", () => {
    let p = initialProgress();
    p = rewardOnce(p, "learned", "home-3", 5);
    p = rewardOnce(p, "learned", "home-3", 5);
    p = rewardOnce(p, "lessons", "home", 30);
    p = rewardOnce(p, "lessons", "home", 30);
    expect(p.xp).toBe(35);
    expect(p.learned).toEqual(["home-3"]);
  });
  it("requires mission steps in order and awards completion once", () => {
    let p = initialProgress();
    p = applyEvent(p, "dialogue", "market", quests as Quest[]);
    expect(p.questSteps).toEqual({});
    for (const [event, id] of [
      ["dialogue", "home"],
      ["visit", "market"],
      ["dialogue", "market"],
      ["visit", "home"],
    ])
      p = applyEvent(p, event, id, quests as Quest[]);
    expect(p.completedQuests).toEqual(["first-day"]);
    expect(p.xp).toBe(60);
    p = applyEvent(p, "visit", "home", quests as Quest[]);
    expect(p.xp).toBe(60);
    expect(restore(JSON.stringify(p)).questSteps["first-day"]).toBe(4);
  });
  it("can finish every configured mission", () => {
    for (const q of quests) {
      let p = { ...initialProgress(), activeQuest: q.id };
      for (const s of q.steps)
        p = applyEvent(p, s.event, s.target, quests as Quest[]);
      expect(p.completedQuests).toContain(q.id);
      expect(p.xp).toBe(q.xp);
    }
  });
  it("brings errors back earlier and expands successful intervals", () => {
    const now = 1000000,
      a = scheduleReview(undefined, true, now),
      b = scheduleReview(a, true, now),
      c = scheduleReview(b, false, now);
    expect(a.due - now).toBe(86400000);
    expect(b.due - now).toBe(3 * 86400000);
    expect(c.due - now).toBe(600000);
    expect(c.successes).toBe(0);
    expect(c.mistakes).toBe(1);
  });
});
