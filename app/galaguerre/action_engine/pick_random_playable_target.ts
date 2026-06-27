import type {
    ActionTarget,
    GamePlayer,
    MinionCard,
    SpellCard,
    SpotOwner,
} from "#api_types/game.types";
import { selectedTargetMatchesAction } from "#api_types/target_matching";
import { shuffleArray } from "../../utils/array.js";
import { playerHasBoardSpace } from "./apply_mind_control.js";
import { cardRequiresActionTarget } from "./requires_action_target.js";

const getCardActions = (card: MinionCard | SpellCard) =>
    card.type === "SPELL" ? card.spellActions : card.battlecryActions ?? [];

const collectCandidateTargets = (player: GamePlayer, opponent: GamePlayer): ActionTarget[] => {
    const candidates: ActionTarget[] = [
        { minionUuid: null, owner: "PLAYER" },
        { minionUuid: null, owner: "OPPONENT" },
    ];

    for (const isOpponent of [true, false] as const) {
        const board = isOpponent ? opponent.board : player.board;
        const owner: SpotOwner = isOpponent ? "OPPONENT" : "PLAYER";

        for (const minion of board) {
            candidates.push({ minionUuid: minion.uuid, owner });
        }
    }

    return candidates;
};

export const collectPlayableTargetsForCard = (
    card: MinionCard | SpellCard,
    player: GamePlayer,
    opponent: GamePlayer,
): ActionTarget[] => {
    if (!cardRequiresActionTarget(card)) return [];

    const playerHasSpace = playerHasBoardSpace(player);
    const targetedActions = getCardActions(card).filter((action) => action.isTargeted);

    return collectCandidateTargets(player, opponent).filter((target) =>
        targetedActions.every((action) =>
            selectedTargetMatchesAction(
                target,
                action,
                player.board,
                opponent.board,
                playerHasSpace,
            ),
        ),
    );
};

export const pickRandomPlayableTarget = (
    card: MinionCard | SpellCard,
    player: GamePlayer,
    opponent: GamePlayer,
): ActionTarget | undefined => {
    const eligible = collectPlayableTargetsForCard(card, player, opponent);
    if (eligible.length === 0) return undefined;

    return shuffleArray(eligible)[0];
};
