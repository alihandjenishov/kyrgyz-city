import type { Progress, Quest, Review } from "../types";
export const STORAGE_KEY = "kyrgyz-city-v1";
export function initialProgress(): Progress {
  return {
    version: 1,
    name: "",
    color: "#cd7259",
    outfit: "jacket",
    started: false,
    lang: "ru",
    xp: 0,
    learned: [],
    lessons: [],
    dialogues: [],
    visited: [],
    favorites: [],
    reviews: {},
    questSteps: {},
    completedQuests: [],
    activeQuest: "first-day",
    position: [-31, 40],
    location: null,
    quality: "medium",
    motion:
      typeof window === "undefined" ||
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    lastPlayed: 0,
    activity: [],
  };
}
export function restore(raw: string | null): Progress {
  const p = initialProgress();
  if (!raw) return p;
  try {
    const v = JSON.parse(raw);
    if (v.version !== 1) return p;
    for (const key of [
      "learned",
      "lessons",
      "dialogues",
      "visited",
      "favorites",
      "completedQuests",
      "activity",
    ] as const)
      if (Array.isArray(v[key]))
        p[key] = v[key]
          .filter((x: unknown) => typeof x === "string")
          .slice(0, 10000);
    if (typeof v.name === "string") p.name = v.name.slice(0, 24);
    if (/^#[a-fA-F0-9]{6}$/.test(v.color)) p.color = v.color;
    if (["ru", "en", "ky"].includes(v.lang)) p.lang = v.lang;
    if (["low", "medium", "high"].includes(v.quality)) p.quality = v.quality;
    p.started = v.started === true;
    p.motion = v.motion !== false;
    p.outfit = v.outfit === "vest" ? "vest" : "jacket";
    p.xp = Number.isFinite(v.xp) ? Math.max(0, Math.floor(v.xp)) : 0;
    if (
      Array.isArray(v.position) &&
      v.position.length === 2 &&
      v.position.every(
        (x: unknown) =>
          typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 49,
      )
    )
      p.position = v.position;
    if (typeof v.location === "string") p.location = v.location;
    if (typeof v.activeQuest === "string") p.activeQuest = v.activeQuest;
    if (v.questSteps && typeof v.questSteps === "object")
      for (const [id, n] of Object.entries(v.questSteps))
        if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 100)
          p.questSteps[id] = n;
    if (v.reviews && typeof v.reviews === "object")
      for (const [id, r] of Object.entries(v.reviews)) {
        const a = r as Review;
        if (
          a &&
          [a.successes, a.mistakes, a.due, a.last].every(
            (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
          )
        )
          p.reviews[id] = a;
      }
    p.lastPlayed = Number.isFinite(v.lastPlayed) ? v.lastPlayed : 0;
    return p;
  } catch {
    return p;
  }
}
export function scheduleReview(
  old: Review | undefined,
  correct: boolean,
  now = Date.now(),
): Review {
  const successes = correct ? (old?.successes ?? 0) + 1 : 0;
  const days = [1, 3, 7, 14, 30][Math.min(4, Math.max(0, successes - 1))];
  return {
    successes,
    mistakes: (old?.mistakes ?? 0) + (correct ? 0 : 1),
    last: now,
    due: now + (correct ? days * 86400000 : 600000),
  };
}
export function applyEvent(
  p: Progress,
  event: string,
  target: string,
  quests: Quest[],
): Progress {
  const q = quests.find((q) => q.id === p.activeQuest);
  if (!q || p.completedQuests.includes(q.id)) return p;
  const idx = p.questSteps[q.id] ?? 0;
  const step = q.steps[idx];
  if (!step || step.event !== event || step.target !== target) return p;
  const next = { ...p, questSteps: { ...p.questSteps, [q.id]: idx + 1 } };
  if (idx + 1 === q.steps.length) {
    next.completedQuests = [...p.completedQuests, q.id];
    next.xp += q.xp;
  }
  return next;
}
export function rewardOnce(
  p: Progress,
  key: "learned" | "lessons" | "dialogues",
  id: string,
  xp: number,
): Progress {
  return p[key].includes(id)
    ? p
    : {
        ...p,
        [key]: [...p[key], id],
        xp: p.xp + xp,
        activity: [`${key}:${id}`, ...p.activity].slice(0, 12),
      };
}
