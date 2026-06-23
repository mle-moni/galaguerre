import type {
    ActionTarget,
    CardActionSnapshot,
    GamePlayer,
    MinionCard,
    SpellCard,
} from "#api_types/game.types";
import { countBoardMinionsOnBoard } from "#api_types/board";
import type { ClientSocketEventByKey } from "#api_types/socket_events";
import { getActionTarget } from "#api_types/action_fields_utils";
import {
    actionRequiresTarget,
    cardHasPlayableTarget,
    heroMatchesTarget,
    minionMatchesTarget,
    selectedTargetMatchesAction,
} from "#api_types/target_matching";
import { playerHasBoardSpace } from "../action_engine/apply_mind_control.js";
import { computeEffectiveCost } from "../dynamic_cost/compute_effective_cost.js";
import { canOpponentDirectlyTargetMinion } from "#api_types/target_matching";
import {
    boardHasAttackableTaunt,
    canMinionAttack,
    canWeaponAttack,
    getMinionHasTaunt,
} from "#controllers/games/game_utils";
import type Game from "#models/game";

export type AiMove =
    | { type: "weapon_action"; action: ClientSocketEventByKey["game:weapon_action"] }
    | { type: "minion_action"; action: ClientSocketEventByKey["game:minion_action"] }
    | { type: "play_card"; action: ClientSocketEventByKey["game:play_card"] }
    | { type: "pass_turn" };

const enumerateHeroAndMinionTargets = (
    targetedActions: CardActionSnapshot[],
    player: GamePlayer,
    opponent: GamePlayer,
): ActionTarget[] => {
    const targets: ActionTarget[] = [];

    for (const isOpponent of [true, false] as const) {
        const heroValid = targetedActions.every((action) => {
            const target = getActionTarget(action);
            if (!target) return false;
            return heroMatchesTarget(target, isOpponent);
        });

        if (heroValid) {
            targets.push({ minionUuid: null, owner: isOpponent ? "OPPONENT" : "PLAYER" });
        }
    }

    for (const isOpponent of [true, false] as const) {
        const board = isOpponent ? opponent.board : player.board;

        for (const minion of board) {
            const minionValid = targetedActions.every((action) => {
                const target = getActionTarget(action);
                if (!target) return false;
                return minionMatchesTarget(minion, target, isOpponent);
            });

            if (minionValid) {
                targets.push({
                    minionUuid: minion.uuid,
                    owner: isOpponent ? "OPPONENT" : "PLAYER",
                });
            }
        }
    }

    return targets;
};

const getTargetedActionsForCard = (card: MinionCard | SpellCard): CardActionSnapshot[] => {
    if (card.type === "SPELL") {
        return card.spellActions.filter((action) => action.isTargeted);
    }

    return (card.battlecryActions ?? []).filter((action) => action.isTargeted);
};

const enumerateTargetsForCard = (
    card: MinionCard | SpellCard,
    player: GamePlayer,
    opponent: GamePlayer,
): ActionTarget[] => {
    if (!actionRequiresTarget(card)) return [];

    const targetedActions = getTargetedActionsForCard(card);
    if (targetedActions.length === 0) return [];

    return enumerateHeroAndMinionTargets(targetedActions, player, opponent);
};

const targetMatchesAllActions = (
    actionTarget: ActionTarget,
    card: MinionCard | SpellCard,
    player: GamePlayer,
    opponent: GamePlayer,
): boolean => {
    const targetedActions = getTargetedActionsForCard(card);

    return targetedActions.every((action) =>
        selectedTargetMatchesAction(
            actionTarget,
            action,
            player.board,
            opponent.board,
            playerHasBoardSpace(player),
        ),
    );
};

const enumerateAttackTargets = (
    opponentBoard: GamePlayer["board"],
    hasAttackableTaunt: boolean,
): Array<{ minionUuid: string | null; owner: "OPPONENT" }> => {
    if (hasAttackableTaunt) {
        return opponentBoard
            .filter(
                (minion) => getMinionHasTaunt(minion) && canOpponentDirectlyTargetMinion(minion),
            )
            .map((minion) => ({
                minionUuid: minion.uuid,
                owner: "OPPONENT" as const,
            }));
    }

    const targets: Array<{ minionUuid: string | null; owner: "OPPONENT" }> = [
        { minionUuid: null, owner: "OPPONENT" },
    ];

    for (const minion of opponentBoard) {
        if (canOpponentDirectlyTargetMinion(minion)) {
            targets.push({ minionUuid: minion.uuid, owner: "OPPONENT" });
        }
    }

    return targets;
};

const enumerateWeaponAttacks = (game: Game, player: GamePlayer, opponent: GamePlayer): AiMove[] => {
    const moves: AiMove[] = [];
    const currentRound = game.data.currentRound;

    if (!canWeaponAttack(player, player.weaponState, currentRound)) {
        return moves;
    }

    const hasAttackableTaunt = boardHasAttackableTaunt(opponent.board);
    const targets = enumerateAttackTargets(opponent.board, hasAttackableTaunt);

    for (const { minionUuid, owner } of targets) {
        moves.push({
            type: "weapon_action",
            action: { minionUuid, owner },
        });
    }

    return moves;
};

const enumerateMinionAttacks = (game: Game, player: GamePlayer, opponent: GamePlayer): AiMove[] => {
    const moves: AiMove[] = [];
    const currentRound = game.data.currentRound;
    const hasAttackableTaunt = boardHasAttackableTaunt(opponent.board);
    const targets = enumerateAttackTargets(opponent.board, hasAttackableTaunt);

    for (const minion of player.board) {
        if (!canMinionAttack(minion, currentRound)) continue;

        for (const target of targets) {
            moves.push({
                type: "minion_action",
                action: {
                    minionId: minion.uuid,
                    minionUuid: target.minionUuid,
                    owner: target.owner,
                },
            });
        }
    }

    return moves;
};

const enumeratePlayCardMoves = (player: GamePlayer, opponent: GamePlayer): AiMove[] => {
    const moves: AiMove[] = [];
    const playableCards = [...player.hand]
        .filter((card) => computeEffectiveCost(card, player, opponent) <= player.mana)
        .sort((a, b) => b.cost - a.cost);

    for (const card of playableCards) {
        if (card.type === "MINION") {
            if (!playerHasBoardSpace(player)) continue;

            const boardIndex = countBoardMinionsOnBoard(player.board);

            if (actionRequiresTarget(card)) {
                if (
                    !cardHasPlayableTarget(
                        card,
                        player.board,
                        opponent.board,
                        playerHasBoardSpace(player),
                    )
                ) {
                    moves.push({
                        type: "play_card",
                        action: {
                            cardId: card.uuid,
                            boardIndex,
                            owner: "PLAYER",
                        },
                    });
                    continue;
                }

                const targets = enumerateTargetsForCard(card, player, opponent);
                for (const actionTarget of targets) {
                    if (!targetMatchesAllActions(actionTarget, card, player, opponent)) {
                        continue;
                    }

                    moves.push({
                        type: "play_card",
                        action: {
                            cardId: card.uuid,
                            boardIndex,
                            owner: "PLAYER",
                            actionTarget,
                        },
                    });
                }
            } else {
                moves.push({
                    type: "play_card",
                    action: {
                        cardId: card.uuid,
                        boardIndex,
                        owner: "PLAYER",
                    },
                });
            }
        } else if (card.type === "SPELL") {
            if (actionRequiresTarget(card)) {
                if (
                    !cardHasPlayableTarget(
                        card,
                        player.board,
                        opponent.board,
                        playerHasBoardSpace(player),
                    )
                ) {
                    continue;
                }

                const targets = enumerateTargetsForCard(card, player, opponent);
                for (const actionTarget of targets) {
                    if (!targetMatchesAllActions(actionTarget, card, player, opponent)) {
                        continue;
                    }

                    moves.push({
                        type: "play_card",
                        action: {
                            cardId: card.uuid,
                            boardIndex: null,
                            owner: "PLAYER",
                            actionTarget,
                        },
                    });
                }
            } else {
                moves.push({
                    type: "play_card",
                    action: {
                        cardId: card.uuid,
                        boardIndex: null,
                        owner: "PLAYER",
                    },
                });
            }
        } else if (card.type === "WEAPON") {
            moves.push({
                type: "play_card",
                action: {
                    cardId: card.uuid,
                    boardIndex: null,
                    owner: "PLAYER",
                },
            });
        }
    }

    return moves;
};

export const enumerateAiMoves = (game: Game, aiUserId: number): AiMove[] => {
    const player =
        game.data.playerOne.userId === aiUserId ? game.data.playerOne : game.data.playerTwo;
    const opponent =
        game.data.playerOne.userId === aiUserId ? game.data.playerTwo : game.data.playerOne;

    const weaponAttacks = enumerateWeaponAttacks(game, player, opponent);
    const minionAttacks = enumerateMinionAttacks(game, player, opponent);
    const playCards = enumeratePlayCardMoves(player, opponent);

    return [...weaponAttacks, ...minionAttacks, ...playCards, { type: "pass_turn" }];
};
