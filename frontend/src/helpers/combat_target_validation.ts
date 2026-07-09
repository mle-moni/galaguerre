import type { ActionTarget, BoardState, MinionState, SpotOwner } from "#api_types/game.types";
import { canOpponentDirectlyTargetMinion } from "#api_types/target_matching";
import { getWeaponCannotAttackHero } from "#api_types/weapon_combat";
import { canMinionAttack } from "~/helpers/minion_combat";
import { canWeaponAttack } from "~/helpers/weapon_combat";
import type { GameStore } from "~/stores/GameStore";

const getMinionHasTaunt = (minion: MinionState): boolean => {
    if (minion.originalCard.type !== "MINION") return false;
    return minion.originalCard.minionPowers?.hasTaunt ?? false;
};

const boardHasAttackableTaunt = (board: BoardState): boolean => {
    return board.some(
        (minion) => getMinionHasTaunt(minion) && canOpponentDirectlyTargetMinion(minion),
    );
};

export const opponentBoardHasAttackableTaunt = (store: GameStore): boolean =>
    boardHasAttackableTaunt(store.authoritativeOpponent.board);

export const findAuthoritativeMinion = (
    store: GameStore,
    minionId: string,
): MinionState | undefined => {
    return store.authoritativeMe.board.find((minion) => minion.uuid === minionId);
};

export const canMinionAttackTarget = (
    store: GameStore,
    minion: MinionState,
    actionTarget: ActionTarget,
): boolean => {
    if (!store.isMyTurn) return false;
    if (actionTarget.owner === "PLAYER") return false;

    const currentRound = store.authoritativeGame.data.currentRound;
    if (!canMinionAttack(minion, currentRound)) return false;

    const opponentBoard = store.authoritativeOpponent.board;
    const hasAttackableTaunt = boardHasAttackableTaunt(opponentBoard);

    if (actionTarget.minionUuid === null) return !hasAttackableTaunt;

    const boardIndex = opponentBoard.findIndex((entry) => entry.uuid === actionTarget.minionUuid);
    if (boardIndex === -1) return false;

    const targetMinion = opponentBoard[boardIndex];
    if (!targetMinion || !canOpponentDirectlyTargetMinion(targetMinion)) return false;

    if (!hasAttackableTaunt) return true;

    return getMinionHasTaunt(targetMinion);
};

export const canWeaponAttackTarget = (store: GameStore, actionTarget: ActionTarget): boolean => {
    if (!store.isMyTurn) return false;
    if (actionTarget.owner === "PLAYER") return false;

    const weaponState = store.authoritativeMe.weaponState;
    if (!weaponState) return false;
    if (
        !canWeaponAttack(
            store.authoritativeMe,
            weaponState,
            store.authoritativeGame.data.currentRound,
        )
    ) {
        return false;
    }

    const opponentBoard = store.authoritativeOpponent.board;
    const hasAttackableTaunt = boardHasAttackableTaunt(opponentBoard);

    if (actionTarget.minionUuid === null) {
        if (getWeaponCannotAttackHero(weaponState.originalCard)) return false;
        return !hasAttackableTaunt;
    }

    const boardIndex = opponentBoard.findIndex((entry) => entry.uuid === actionTarget.minionUuid);
    if (boardIndex === -1) return false;

    const targetMinion = opponentBoard[boardIndex];
    if (!targetMinion || !canOpponentDirectlyTargetMinion(targetMinion)) return false;

    if (!hasAttackableTaunt) return true;

    return getMinionHasTaunt(targetMinion);
};

export const weaponHasAnyAttackTarget = (store: GameStore): boolean => {
    const weaponState = store.authoritativeMe.weaponState;
    if (!weaponState) return false;

    if (
        !canWeaponAttack(
            store.authoritativeMe,
            weaponState,
            store.authoritativeGame.data.currentRound,
        )
    ) {
        return false;
    }

    const opponentBoard = store.authoritativeOpponent.board;
    const hasAttackableTaunt = boardHasAttackableTaunt(opponentBoard);

    if (hasAttackableTaunt) {
        return opponentBoard.some(
            (minion) => getMinionHasTaunt(minion) && canOpponentDirectlyTargetMinion(minion),
        );
    }

    if (!getWeaponCannotAttackHero(weaponState.originalCard)) return true;

    return opponentBoard.some((minion) => canOpponentDirectlyTargetMinion(minion));
};

export const canMinionAttackBoardIndex = (
    store: GameStore,
    minion: MinionState,
    boardIndex: number | null,
    spotOwner: SpotOwner,
): boolean => {
    if (spotOwner === "PLAYER") return false;

    if (boardIndex === null) {
        return canMinionAttackTarget(store, minion, { minionUuid: null, owner: spotOwner });
    }

    const targetMinion = store.authoritativeOpponent.board[boardIndex];
    if (!targetMinion) return false;

    return canMinionAttackTarget(store, minion, {
        minionUuid: targetMinion.uuid,
        owner: spotOwner,
    });
};

export const canWeaponAttackBoardIndex = (
    store: GameStore,
    boardIndex: number | null,
    spotOwner: SpotOwner,
): boolean => {
    if (spotOwner === "PLAYER") return false;

    if (boardIndex === null) {
        return canWeaponAttackTarget(store, { minionUuid: null, owner: spotOwner });
    }

    const targetMinion = store.authoritativeOpponent.board[boardIndex];
    if (!targetMinion) return false;

    return canWeaponAttackTarget(store, {
        minionUuid: targetMinion.uuid,
        owner: spotOwner,
    });
};
