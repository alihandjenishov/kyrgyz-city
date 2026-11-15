export type Lang = "ru" | "en" | "ky";
export type Translation = Record<Lang, string>;
export interface Word {
  id: string;
  ky: string;
  translations: Translation;
  category: string;
  level: string;
  example: string;
  context: Translation;
  audio: string | null;
  location: string;
  review_status: string;
}
export interface Lesson {
  id: string;
  title: Translation;
  location: string;
  level: string;
  word_ids: string[];
  minutes: number;
  note: Translation;
  sentence: string[];
  sentence_translation: Translation;
}
export interface Location {
  id: string;
  title: Translation;
  ky: string;
  position: [number, number];
  size: [number, number];
  color: string;
  kind: string;
  entrance: [number, number];
  npc: { name: string; role: Translation };
  dialogue: string;
  word_ids: string[];
}
export interface Dialogue {
  id: string;
  location: string;
  nodes: {
    id: string;
    text: string;
    translation: Translation;
    options: { text: string; correct: boolean; next: string | null }[];
    explanation: Translation;
  }[];
}
export interface Quest {
  id: string;
  title: Translation;
  steps: { event: string; target: string; text: Translation }[];
  xp: number;
}
export interface Catalogue {
  vocabulary: Word[];
  lessons: Lesson[];
  locations: Location[];
  dialogues: Dialogue[];
  quests: Quest[];
}
export interface Review {
  successes: number;
  mistakes: number;
  due: number;
  last: number;
}
export interface Progress {
  version: 1;
  name: string;
  color: string;
  outfit: string;
  started: boolean;
  lang: Lang;
  xp: number;
  learned: string[];
  lessons: string[];
  dialogues: string[];
  visited: string[];
  favorites: string[];
  reviews: Record<string, Review>;
  questSteps: Record<string, number>;
  completedQuests: string[];
  activeQuest: string;
  position: [number, number];
  location: string | null;
  quality: "low" | "medium" | "high";
  motion: boolean;
  lastPlayed: number;
  activity: string[];
}
