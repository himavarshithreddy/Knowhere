import { generateCoords } from "@knowhere/shared";
import { User } from "../models/index.js";
import { coordsLookup } from "./coords.js";

export async function findAvailableCoords(count = 4, maxAttempts = count * 40) {
  const suggestions: string[] = [];
  const seen = new Set<string>();
  let attempts = 0;

  while (suggestions.length < count && attempts < maxAttempts) {
    attempts += 1;
    const coords = generateCoords();
    if (seen.has(coords)) continue;
    seen.add(coords);

    const taken = await User.findOne({ accessCodeLookup: coordsLookup(coords) });
    if (!taken) suggestions.push(coords);
  }

  return suggestions;
}

export async function pickAvailableCoords(maxAttempts = 40) {
  const [coords] = await findAvailableCoords(1, maxAttempts);
  if (!coords) throw new Error("Could not find available Coords. Try again.");
  return coords;
}
