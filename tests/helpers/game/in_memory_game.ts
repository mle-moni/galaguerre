import type { GameData } from "#api_types/game.types";
import type Game from "#models/game";
import { createSimulationGame } from "#galaguerre/simulation/simulation_game";

export const createInMemoryGame = (data: GameData): Game => createSimulationGame(data, 1);
