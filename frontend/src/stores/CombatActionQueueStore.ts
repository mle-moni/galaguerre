import type { ActionTarget } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";
import {
    canMinionAttackTarget,
    canWeaponAttackTarget,
    findAuthoritativeMinion,
} from "~/helpers/combat_target_validation";
import { emitSocketEventToServer, isSocketReady } from "~/services/ws_client";
import type { GameStore } from "./GameStore.js";

export type QueuedMinionAction = {
    type: "minion";
    minionId: string;
    minionUuid: string | null;
    owner: ActionTarget["owner"];
};

export type QueuedWeaponAction = {
    type: "weapon";
    minionUuid: string | null;
    owner: ActionTarget["owner"];
};

export type QueuedPassTurnAction = {
    type: "pass_turn";
};

export type QueuedCombatAction = QueuedMinionAction | QueuedWeaponAction | QueuedPassTurnAction;

export class CombatActionQueueStore {
    queue: QueuedCombatAction[] = [];
    private inFlightMinionIds = new Set<string>();
    private inFlightWeaponAttack = false;
    private inFlightPassTurn = false;

    constructor(private readonly gameStore: GameStore) {
        makeAutoObservable(this);
    }

    clear() {
        this.queue = [];
        this.inFlightMinionIds.clear();
        this.inFlightWeaponAttack = false;
        this.inFlightPassTurn = false;
    }

    resetInFlight() {
        this.inFlightMinionIds.clear();
        this.inFlightWeaponAttack = false;
        this.inFlightPassTurn = false;
    }

    isPassTurnReserved() {
        if (this.inFlightPassTurn) return true;
        return this.queue.some((action) => action.type === "pass_turn");
    }

    isMinionReserved(minionId: string) {
        if (this.inFlightMinionIds.has(minionId)) return true;
        return this.queue.some(
            (action) => action.type === "minion" && action.minionId === minionId,
        );
    }

    isWeaponReserved() {
        if (this.inFlightWeaponAttack) return true;
        return this.queue.some((action) => action.type === "weapon");
    }

    enqueuePassTurn() {
        if (!this.gameStore.isMyTurn) return;
        if (this.isPassTurnReserved()) return;

        this.gameStore.minionDragStore.cancelAttack();
        this.gameStore.weaponDragStore.cancelAttack();

        this.queue.push({ type: "pass_turn" });
        this.flush();
    }

    enqueueMinionAction(minionId: string, target: ActionTarget) {
        if (this.isPassTurnReserved()) return;

        const minion = findAuthoritativeMinion(this.gameStore, minionId);
        if (!minion || !canMinionAttackTarget(this.gameStore, minion, target)) return;
        if (this.isMinionReserved(minionId)) return;

        this.queue.push({
            type: "minion",
            minionId,
            minionUuid: target.minionUuid,
            owner: target.owner,
        });
        this.flush();
    }

    enqueueWeaponAction(target: ActionTarget) {
        if (this.isPassTurnReserved()) return;
        if (!canWeaponAttackTarget(this.gameStore, target)) return;
        if (this.isWeaponReserved()) return;

        this.queue.push({
            type: "weapon",
            minionUuid: target.minionUuid,
            owner: target.owner,
        });
        this.flush();
    }

    flush() {
        if (!this.gameStore.isMyTurn) return;
        if (
            this.gameStore.isNarrativePlaying ||
            this.gameStore.narrativeDirector.narrativePlaying
        ) {
            return;
        }
        if (this.queue.length === 0) return;
        if (!isSocketReady()) return;

        while (this.queue.length > 0) {
            const next = this.queue[0];
            if (!this.isActionValid(next)) {
                this.queue.shift();
                continue;
            }

            const action = this.queue.shift()!;
            this.sendAction(action);
            return;
        }
    }

    private isActionValid(action: QueuedCombatAction): boolean {
        if (action.type === "pass_turn") {
            return this.gameStore.isMyTurn;
        }

        if (action.type === "minion") {
            const minion = findAuthoritativeMinion(this.gameStore, action.minionId);
            if (!minion) return false;

            return canMinionAttackTarget(this.gameStore, minion, {
                minionUuid: action.minionUuid,
                owner: action.owner,
            });
        }

        return canWeaponAttackTarget(this.gameStore, {
            minionUuid: action.minionUuid,
            owner: action.owner,
        });
    }

    private sendAction(action: QueuedCombatAction) {
        if (action.type === "pass_turn") {
            this.inFlightPassTurn = true;
            this.queue = [];
            this.gameStore.markPassTurnSubmitted();
            emitSocketEventToServer("pass_turn", {});
            return;
        }

        if (action.type === "minion") {
            this.inFlightMinionIds.add(action.minionId);
            emitSocketEventToServer("game:minion_action", {
                minionId: action.minionId,
                minionUuid: action.minionUuid,
                owner: action.owner,
            });
            return;
        }

        this.inFlightWeaponAttack = true;
        emitSocketEventToServer("game:weapon_action", {
            minionUuid: action.minionUuid,
            owner: action.owner,
        });
    }
}
