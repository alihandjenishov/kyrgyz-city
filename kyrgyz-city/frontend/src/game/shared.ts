export const movementKeys = new Set<string>();
export const objectSpecs: Record<
  string,
  { word: string; kind: string; x: number; z: number }[]
> = {
  home: [
    { word: "home-3", kind: "window", x: -6, z: -9.7 },
    { word: "home-4", kind: "table", x: 0, z: 0 },
    { word: "home-6", kind: "bed", x: -6, z: -4 },
    { word: "home-9", kind: "mirror", x: 6, z: -9.7 },
    { word: "home-10", kind: "towel", x: 8, z: -4 },
    { word: "home-7", kind: "kitchen", x: 6, z: -7 },
    { word: "home-2", kind: "door", x: -1, z: -9.7 },
    { word: "school-4", kind: "book", x: -3, z: 3 },
  ],
  school: [
    { word: "school-4", kind: "book", x: -4, z: 0 },
    { word: "school-5", kind: "book", x: 2, z: 0 },
    { word: "school-6", kind: "pen", x: 6, z: 0 },
    { word: "home-4", kind: "table", x: 0, z: -6 },
    { word: "home-3", kind: "window", x: -6, z: -9.7 },
  ],
  market: [
    { word: "food-1", kind: "bread", x: -6, z: 0 },
    { word: "food-2", kind: "water", x: 0, z: 0 },
    { word: "food-5", kind: "apple", x: 6, z: 0 },
    { word: "shopping-3", kind: "money", x: 5, z: -6 },
  ],
  cafe: [
    { word: "food-4", kind: "tea", x: -5, z: 1 },
    { word: "food-8", kind: "bread", x: 4, z: 1 },
    { word: "food-2", kind: "water", x: 0, z: -5 },
  ],
  clinic: [
    { word: "health-3", kind: "bottle", x: -6, z: -4 },
    { word: "home-6", kind: "bed", x: 5, z: 0 },
    { word: "home-5", kind: "chair", x: -6, z: 4 },
    { word: "home-4", kind: "table", x: 0, z: -6 },
  ],
  library: [
    { word: "school-4", kind: "shelf", x: -7, z: -5 },
    { word: "school-5", kind: "book", x: 0, z: 0 },
    { word: "home-4", kind: "table", x: 5, z: 2 },
    { word: "home-3", kind: "window", x: 0, z: -9.7 },
  ],
  park: [
    { word: "colors-3", kind: "plant", x: -6, z: -4 },
    { word: "colors-4", kind: "flower", x: 6, z: 0 },
    { word: "home-5", kind: "chair", x: -6, z: 4 },
  ],
  bus: [
    { word: "transport-4", kind: "ticket", x: -5, z: 0 },
    { word: "transport-1", kind: "bus", x: 5, z: -4 },
    { word: "home-5", kind: "chair", x: -5, z: -5 },
  ],
  bank: [
    { word: "shopping-3", kind: "money", x: -5, z: 0 },
    { word: "travel-6", kind: "passport", x: 5, z: 0 },
    { word: "time-4", kind: "clock", x: 0, z: -9.7 },
  ],
  hotel: [
    { word: "travel-5", kind: "key", x: -5, z: 0 },
    { word: "travel-6", kind: "passport", x: 5, z: 0 },
    { word: "home-6", kind: "bed", x: -6, z: -6 },
    { word: "home-9", kind: "mirror", x: 6, z: -9.7 },
  ],
};
export function interiorWordIds(id: string) {
  return (objectSpecs[id] ?? []).map((o) => o.word);
}
