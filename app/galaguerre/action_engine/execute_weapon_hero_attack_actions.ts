import type { GamePlayer, WeaponCard } from "#api_types/game.types";
import type Game from "#models/game";
import { beginLoggedBeatIfNone, endCurrentBeat } from "../game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "../game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "../game_narrative/narrative_context.js";
import { executeActionSequence } from "./execute_action_sequence.js";
import { isTargetedV1Action } from "./is_targeted_v1_action.js";
import { isV1Action } from "./is_v1_action.js";

const getOpponent = (game: Game, player: GamePlayer): GamePlayer => {
    return player === game.data.playerOne ? game.data.playerTwo : game.data.playerOne;
};

const isGameOver = (game: Game): boolean => {
    return game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0;
};

export const executeWeaponHeroAttackActions = (
    game: Game,
    player: GamePlayer,
    card: WeaponCard,
): { gameEnded: boolean; discoverPending: boolean } => {
    const opponent = getOpponent(game, player);
    const actions = card.heroAttackActions ?? [];

    const hasValidAction = actions.some(
        (action) => isV1Action(action) || isTargetedV1Action(action),
    );
    if (!hasValidAction) {
        return { gameEnded: false, discoverPending: false };
    }

    const owner = resolveSpotOwner(game, player);

    withNarrativeRecorder((recorder) => {
        beginLoggedBeatIfNone(game, "TRIGGER");
        recorder.recordEffect({
            type: "TRIGGER",
            cardUuid: card.uuid,
            owner,
            trigger: "ATTACK",
        });
    });

    for (const action of actions) {
        if (!isV1Action(action) && !isTargetedV1Action(action)) continue;

        const result = executeActionSequence(game, player, opponent, [action], {
            sourceCard: { cardId: card.cardId, label: card.label, uuid: card.uuid },
            effectKind: "HERO_ATTACK",
        });

        if (result.discoverPending) {
            return result;
        }

        if (result.gameEnded || isGameOver(game)) {
            endCurrentBeat(game);
            return { gameEnded: true, discoverPending: false };
        }
    }

    endCurrentBeat(game);
    return { gameEnded: false, discoverPending: false };
};
