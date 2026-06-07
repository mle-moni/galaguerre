import type { GameLogEntry, GamePlayer, PlayerCard } from "#api_types/game.types";
import type Game from "#models/game";
import { randomUUID } from "node:crypto";

const appendLogEntry = (game: Game, entry: Omit<GameLogEntry, "id">): void => {
    game.data.actionLog.push({ ...entry, id: randomUUID() });
};

export const recordPlayCard = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "PLAY_CARD",
        card: structuredClone(card),
    });
};

export const recordPassTurn = (game: Game, player: GamePlayer): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "PASS_TURN",
    });
};

export const recordFatigueDamage = (game: Game, player: GamePlayer, damage: number): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "FATIGUE_DAMAGE",
        fatigueDamage: damage,
    });
};
