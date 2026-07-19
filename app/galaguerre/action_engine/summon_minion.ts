import {
    countBoardMinionsOnBoard,
    insertMinionAtIndex,
    playerHasBoardSpace,
} from "#api_types/board";
import type {
    GamePlayer,
    MinionCard,
    MinionState,
    ReconvertParametersSnapshot,
} from "#api_types/game.types";
import type Game from "#models/game";
import { randomUUID } from "node:crypto";
import { instantiateMinion } from "../../controllers/games/play_card/instantiate_minion.js";
import { playerOwnsGoldenCard } from "../golden/resolve_is_golden_for_player.js";
import { refreshAurasAfterMinionPlayed } from "../passive_engine/refresh_passive_auras.js";
import { resolveReconvertTemplate } from "./resolve_reconvert_template.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";

export { playerHasBoardSpace } from "#api_types/board";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const cloneTemplateForSummon = (template: MinionCard, owner: GamePlayer): MinionCard => ({
    ...template,
    uuid: randomUUID(),
    isGolden: playerOwnsGoldenCard(
        template.cardId,
        template.goldenVideoUrl,
        owner.ownedGoldenCardIds ?? [],
    ),
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
    stealthConsumed: false,
    initialKeywords: {
        hasTaunt: false,
        hasCharge: false,
        hasRush: false,
        hasWindfury: false,
        isPoisonous: false,
        hasStealth: false,
        hasDivineShield: false,
    },
    permanentKeywords: {
        hasTaunt: false,
        hasCharge: false,
        hasRush: false,
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
        goldenVideoUrl: null,
        isGolden: false,
        baseCost: 0,
        cost: 0,
        dynamicCost: null,
        tags: [],
        labelTags: [],
        rarity: "COMMON",
        type: "MINION",
        health: 1,
        attack: 0,
        minionPowers: {
            hasTaunt: false,
            hasCharge: false,
            hasRush: false,
            hasWindfury: false,
            isPoisonous: false,
            hasStealth: false,
            hasDivineShield: false,
        },
        effects: [],
        description: "",
        battlecryActions: [],
        comboActions: [],
        deathrattleActions: [],
        attackActions: [],
        passives: [],
    },
    isSilenced: false,
});

export const insertMinionOnBoard = (
    game: Game,
    owner: GamePlayer,
    boardIndex: number,
    card: MinionCard,
): { inserted: boolean; boardIndex: number | null } => {
    const minion = instantiateMinion(card, game.data.currentRound);
    const { inserted } = insertMinionAtIndex(owner.board, boardIndex, minion);

    if (!inserted) {
        return { inserted: false, boardIndex: null };
    }

    refreshAurasAfterMinionPlayed(game, owner, boardIndex);

    return { inserted: true, boardIndex };
};

export const summonMinionToBoard = (
    game: Game,
    controller: GamePlayer,
    targetTeam: "PLAYER" | "OPPONENT",
    template: MinionCard,
): { summoned: boolean; summonedCard: MinionCard | null } => {
    const owner = targetTeam === "PLAYER" ? controller : getOpponent(game, controller);
    if (!playerHasBoardSpace(owner)) {
        return { summoned: false, summonedCard: null };
    }

    const boardIndex = countBoardMinionsOnBoard(owner.board);

    const card = cloneTemplateForSummon(template, owner);
    const { inserted, boardIndex: insertedIndex } = insertMinionOnBoard(
        game,
        owner,
        boardIndex,
        card,
    );
    if (inserted && insertedIndex !== null) {
        const ownerSpot = resolveSpotOwner(game, owner);
        withNarrativeRecorder((recorder) => {
            recorder.recordEffect({
                type: "SUMMON",
                cardUuid: card.uuid,
                owner: ownerSpot,
                boardIndex: insertedIndex,
            });
        });
    }
    return { summoned: inserted, summonedCard: inserted ? card : null };
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
        if (!playerHasBoardSpace(owner)) break;

        const template = resolveReconvertTemplate(parameters, sourceForTemplate);
        if (!template) break;

        const card = cloneTemplateForSummon(template, owner);
        const boardIndex = countBoardMinionsOnBoard(owner.board);
        const { inserted, boardIndex: insertedIndex } = insertMinionOnBoard(
            game,
            owner,
            boardIndex,
            card,
        );
        if (inserted) {
            const ownerSpot = resolveSpotOwner(game, owner);
            withNarrativeRecorder((recorder) => {
                recorder.recordEffect({
                    type: "SUMMON",
                    cardUuid: card.uuid,
                    owner: ownerSpot,
                    boardIndex: insertedIndex ?? boardIndex,
                });
            });
            summonedCards.push(card);
        }
    }

    return { summonedCards };
};
