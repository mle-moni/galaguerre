import type {
    GamePlayer,
    MinionCard,
    MinionSpotId,
    MinionState,
    ReconvertParametersSnapshot,
} from "#api_types/game.types";
import type Game from "#models/game";
import { randomUUID } from "node:crypto";
import { instantiateMinion } from "../../controllers/games/play_card/instantiate_minion.js";
import { refreshAurasAfterMinionPlayed } from "../passive_engine/refresh_passive_auras.js";
import { findFirstEmptyBoardSpot } from "./apply_mind_control.js";
import { resolveReconvertTemplate } from "./resolve_reconvert_template.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const cloneTemplateForSummon = (template: MinionCard): MinionCard => ({
    ...template,
    uuid: randomUUID(),
});

const createDefaultSourceMinion = (): MinionState => ({
    uuid: "summon-source-placeholder",
    health: 1,
    attack: 0,
    maxHealth: 1,
    placedAtRound: 0,
    lastActionAtRound: 0,
    attacksThisRound: 0,
    divineShieldConsumed: false,
    initialKeywords: {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
        hasStealth: false,
        hasDivineShield: false,
    },
    permanentKeywords: {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
        hasStealth: false,
        hasDivineShield: false,
    },
    originalCard: {
        uuid: "summon-source-placeholder",
        cardId: 0,
        label: "Placeholder",
        imageUrl: "",
        baseCost: 0,
        cost: 0,
        dynamicCost: null,
        tags: [],
        type: "MINION",
        health: 1,
        attack: 0,
        minionPowers: {
            hasTaunt: false,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
        effects: [],
        description: "",
        battlecryActions: [],
        deathrattleActions: [],
        passives: [],
    },
    isSilenced: false,
});

export const summonMinionAtSpot = (
    game: Game,
    owner: GamePlayer,
    spotId: MinionSpotId,
    card: MinionCard,
): { summoned: boolean } => {
    if (owner.board[spotId] !== null) {
        return { summoned: false };
    }

    owner.board[spotId] = instantiateMinion(card, game.data.currentRound);
    refreshAurasAfterMinionPlayed(game, owner, spotId);

    return { summoned: true };
};

export const summonMinionToBoard = (
    game: Game,
    controller: GamePlayer,
    targetTeam: "PLAYER" | "OPPONENT",
    template: MinionCard,
): { summoned: boolean; summonedCard: MinionCard | null } => {
    const owner = targetTeam === "PLAYER" ? controller : getOpponent(game, controller);
    const spotId = findFirstEmptyBoardSpot(owner.board);
    if (!spotId) {
        return { summoned: false, summonedCard: null };
    }

    const card = cloneTemplateForSummon(template);
    const { summoned } = summonMinionAtSpot(game, owner, spotId, card);
    return { summoned, summonedCard: summoned ? card : null };
};

export const summonMinions = (
    game: Game,
    controller: GamePlayer,
    targetTeam: "PLAYER" | "OPPONENT",
    parameters: ReconvertParametersSnapshot,
    count: number,
    sourceMinion?: MinionState,
): { summonedCards: MinionCard[] } => {
    const owner = targetTeam === "PLAYER" ? controller : getOpponent(game, controller);
    const summonedCards: MinionCard[] = [];
    const sourceForTemplate = sourceMinion ?? createDefaultSourceMinion();

    for (let i = 0; i < count; i++) {
        const spotId = findFirstEmptyBoardSpot(owner.board);
        if (!spotId) break;

        const template = resolveReconvertTemplate(parameters, sourceForTemplate);
        if (!template) break;

        const card = cloneTemplateForSummon(template);
        const { summoned } = summonMinionAtSpot(game, owner, spotId, card);
        if (summoned) {
            summonedCards.push(card);
        }
    }

    return { summonedCards };
};
