import type {
    GameLogAttackTarget,
    GameLogEntry,
    GamePlayer,
    PlayerCard,
} from "#api_types/game.types";
import type Game from "#models/game";
import { randomUUID } from "node:crypto";
import { isSimulating } from "../../utils/simulation_context.js";

/**
 * En simulation, le journal n'est jamais relu : aucune règle ne le consulte, et la narration qui
 * lit sa dernière entrée est elle-même désactivée (voir `runGameActionWithNarrative`). Le nourrir
 * pendant une recherche revient donc à faire grossir, à chaque coup exploré, une structure que
 * `applyAiMove` recopiera intégralement au coup suivant — sur une branche profonde le journal
 * devient l'essentiel du coût du clone.
 */
const appendLogEntry = (game: Game, entry: Omit<GameLogEntry, "id">): void => {
    if (isSimulating()) return;

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

export const recordCastWhenDrawn = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "CAST_WHEN_DRAWN",
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

export const recordCardDraw = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "DRAW",
        card: structuredClone(card),
    });
};

export const recordOverdraw = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "OVERDRAW",
        card: structuredClone(card),
    });
};

export const recordAttack = (
    game: Game,
    player: GamePlayer,
    attackerCard: PlayerCard,
    attackTarget: GameLogAttackTarget,
): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "ATTACK",
        attackerCard: structuredClone(attackerCard),
        attackTarget: {
            type: attackTarget.type,
            card: attackTarget.card ? structuredClone(attackTarget.card) : undefined,
            playerId: attackTarget.playerId,
        },
    });
};

export const recordBattlecry = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "BATTLECRY",
        card: structuredClone(card),
    });
};

export const recordCombo = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "COMBO",
        card: structuredClone(card),
    });
};

export const recordDeathrattle = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "DEATHRATTLE",
        card: structuredClone(card),
    });
};

export const recordAttackEffect = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "ATTACK_EFFECT",
        card: structuredClone(card),
    });
};

export const recordMinionDeath = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "MINION_DEATH",
        card: structuredClone(card),
    });
};

export const recordWeaponBreak = (game: Game, player: GamePlayer, card: PlayerCard): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "WEAPON_BREAK",
        card: structuredClone(card),
    });
};

export const recordAbandon = (game: Game, player: GamePlayer): void => {
    appendLogEntry(game, {
        roundNumber: game.data.currentRound,
        playerId: player.userId,
        type: "ABANDON",
    });
};
