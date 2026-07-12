/**
 * Cuelume — curated interaction sounds synthesized via the Web Audio API.
 * No audio files, no dependencies, one shared `AudioContext`.
 *
 * Declarative:
 *   import { bind } from "cuelume";
 *   bind(); // wires up all data-cuelume-* attributes
 *
 * Imperative:
 *   import { play } from "cuelume";
 *   play("droplet");
 */

export type { SoundName } from "./sounds/recipes.ts";
export { sounds } from "./sounds/recipes.ts";
export { play, setEnabled } from "./audio/engine.ts";
export { bind } from "./interactions/bind.ts";
