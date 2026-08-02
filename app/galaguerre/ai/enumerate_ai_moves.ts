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
    getMinionPlayTargetedActions,
    heroMatchesTarget,
    minionMatchesTarget,
    selectedTargetMatchesAction,
} from "#api_types/target_matching";
import { playerHasBoardSpace } from "../action_engine/apply_mind_control.js";
import { isComboActive } from "../combo/combo_state.js";
import { computeEffectiveCost } from "../dynamic_cost/compute_effective_cost.js";
import { canOpponentDirectlyTargetMinion } from "#api_types/target_matching";
import {
    boardHasAttackableTaunt,
    canMinionAttack,
    canMinionAttackHero,
    canWeaponAttack,
    getMinionHasTaunt,
} from "#controllers/games/game_utils";
import { getWeaponCannotAttackHero } from "#api_types/weapon_combat";
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

const getTargetedActionsForCard = (
    card: MinionCard | SpellCard,
    comboActive: boolean,
): CardActionSnapshot[] => {
    if (card.type === "SPELL") {
        return card.spellActions.filter((action) => action.isTargeted);
    }

    return getMinionPlayTargetedActions(card, comboActive);
};

const enumerateTargetsForCard = (
    card: MinionCard | SpellCard,
    player: GamePlayer,
    opponent: GamePlayer,
): ActionTarget[] => {
    const comboActive = card.type === "MINION" ? isComboActive(player) : false;
    if (!actionRequiresTarget(card, { comboActive })) return [];

    const targetedActions = getTargetedActionsForCard(card, comboActive);
    if (targetedActions.length === 0) return [];

    return enumerateHeroAndMinionTargets(targetedActions, player, opponent);
};

const targetMatchesAllActions = (
    actionTarget: ActionTarget,
    card: MinionCard | SpellCard,
    player: GamePlayer,
    opponent: GamePlayer,
): boolean => {
    const comboActive = card.type === "MINION" ? isComboActive(player) : false;
    const targetedActions = getTargetedActionsForCard(card, comboActive);

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
    includeHeroTarget = true,
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

    const targets: Array<{ minionUuid: string | null; owner: "OPPONENT" }> = [];

    if (includeHeroTarget) {
        targets.push({ minionUuid: null, owner: "OPPONENT" });
    }

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
    const weaponState = player.weaponState;

    if (!canWeaponAttack(player, weaponState, currentRound)) {
        return moves;
    }

    const hasAttackableTaunt = boardHasAttackableTaunt(opponent.board);
    const includeHeroTarget = weaponState
        ? !getWeaponCannotAttackHero(weaponState.originalCard)
        : true;
    const targets = enumerateAttackTargets(opponent.board, hasAttackableTaunt, includeHeroTarget);

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

    for (const minion of player.board) {
        if (!canMinionAttack(minion, currentRound)) continue;

        const includeHeroTarget = canMinionAttackHero(minion, currentRound);
        const targets = enumerateAttackTargets(
            opponent.board,
            hasAttackableTaunt,
            includeHeroTarget,
        );

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

/**
 * Positions d'invocation à explorer pour un monstre.
 *
 * La position sur le plateau n'a d'incidence mécanique QUE pour les effets d'adjacence : partout
 * ailleurs, énumérer plusieurs emplacements ne ferait que multiplier le facteur de branchement de
 * la recherche pour des états rigoureusement équivalents. On ne paie donc ce coût que pour les
 * cartes concernées — aujourd'hui une poignée dans le catalogue.
 */
const cardCaresAboutAdjacency = (card: MinionCard): boolean => {
    const actions = [
        ...card.battlecryActions,
        ...card.comboActions,
        ...card.deathrattleActions,
        ...card.attackActions,
        ...card.passives.flatMap((passive) => (passive.action ? [passive.action] : [])),
    ];

    if (actions.some((action) => getActionTarget(action)?.adjacency === "SOURCE")) return true;

    return card.passives.some((passive) => passive.passiveBoost?.target?.adjacency === "SOURCE");
};

const enumerateBoardIndexes = (card: MinionCard, player: GamePlayer): number[] => {
    const rightmost = countBoardMinionsOnBoard(player.board);
    if (rightmost === 0 || !cardCaresAboutAdjacency(card)) return [rightmost];

    // Chaque emplacement donne un couple de voisins différent : tous méritent d'être simulés.
    return Array.from({ length: rightmost + 1 }, (_, index) => index);
};

const enumeratePlayCardMoves = (player: GamePlayer, opponent: GamePlayer): AiMove[] => {
    const moves: AiMove[] = [];
    const playableCards = [...player.hand]
        .filter((card) => computeEffectiveCost(card, player, opponent) <= player.mana)
        .sort((a, b) => b.cost - a.cost);

    for (const card of playableCards) {
        if (card.type === "MINION") {
            if (!playerHasBoardSpace(player)) continue;

            const boardIndexes = enumerateBoardIndexes(card, player);
            const comboActive = isComboActive(player);

            if (actionRequiresTarget(card, { comboActive })) {
                if (
                    !cardHasPlayableTarget(
                        card,
                        player.board,
                        opponent.board,
                        playerHasBoardSpace(player),
                        { comboActive },
                    )
                ) {
                    for (const boardIndex of boardIndexes) {
                        moves.push({
                            type: "play_card",
                            action: {
                                cardId: card.uuid,
                                boardIndex,
                                owner: "PLAYER",
                            },
                        });
                    }
                    continue;
                }

                const targets = enumerateTargetsForCard(card, player, opponent);
                for (const actionTarget of targets) {
                    if (!targetMatchesAllActions(actionTarget, card, player, opponent)) {
                        continue;
                    }

                    for (const boardIndex of boardIndexes) {
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
                }
            } else {
                for (const boardIndex of boardIndexes) {
                    moves.push({
                        type: "play_card",
                        action: {
                            cardId: card.uuid,
                            boardIndex,
                            owner: "PLAYER",
                        },
                    });
                }
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
