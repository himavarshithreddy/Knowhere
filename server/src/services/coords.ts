import { createHmac, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { generateCoords, normalizeCoords } from "@knowhere/shared";
import { config } from "../config.js";

export const parseCoords = (value: string) => normalizeCoords(value);

export const coordsLookup = (coords: string) =>
  createHmac("sha256", config.coordsPepper).update(coords).digest("hex");

export const hashCoords = async (coords: string) => bcrypt.hash(coords, 12);

export const verifyCoords = async (coords: string, hash: string) => bcrypt.compare(coords, hash);

export { generateCoords };

export const createCoordsUserId = () => `coords_${randomUUID()}`;
