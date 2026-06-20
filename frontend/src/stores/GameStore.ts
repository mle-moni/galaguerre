import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame, GamePlayer, SpotOwner } from "#api_types/game.types";
import { makeAutoObservable } from "mobx";
import { _assert } from "~/helpers/assertions";
import { notifyError } from "~/services/toasts";
import { CLIENT_SOCKET, isSocketReady } from "~/services/ws_client";
import { CardDragStore } from "./CardDragStore.js";
import { MinionDragStore } from "./MinionDragStore.js";
import { PlayerInfosStore } from "./PlayerInfosStore.js";
import { TargetSelectionStore } from "./TargetSelectionStore.js";
import { TargetingArrowStore } from "./TargetingArrowStore.js";
import { WeaponDragStore } from "./WeaponDragStore.js";

export type TargetHighlight = "valid" | "invalid" | "none";

const TRANSPARENT = "RGBa(0, 0, 0, 0)";

const colorToTargetHighlight = (color: string): TargetHighlight => {
    if (color === "green") return "valid";
    if (color === "red") return "invalid";
    return "none";
};

export class GameStore {
    cardDragStore = new CardDragStore(this);
    minionDragStore = new MinionDragStore(this);
    weaponDragStore = new WeaponDragStore(this);
    playerInfosStore = new PlayerInfosStore(this);
    targetSelectionStore = new TargetSelectionStore(this);
    targetingArrowStore = new TargetingArrowStore(this);

    private _game: ApiGame | null = null;
    private _user: ApiUser | null = null;
    mulliganSelectedCardIds: string[] = [];
    mulliganConfirmedLocally = false;
    private passTurnSubmittedAt: { state: ApiGame["data"]["state"]; round: number } | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get game() {
        _assert(this._game, "GameStore not initialized");
        return this._game;
    }

    get user() {
        _assert(this._user, "GameStore not initialized");
        return this._user;
    }

    init(game: ApiGame, user: ApiUser): GameStore {
        const isNewGame = this._game?.id !== game.id;
        const leavingMulligan =
            !isNewGame && this._game?.data.state === "MULLIGAN" && game.data.state !== "MULLIGAN";

        this._game = game;
        this._user = user;

        if (isNewGame || leavingMulligan) {
            this.mulliganSelectedCardIds = [];
            this.mulliganConfirmedLocally = false;
            this.passTurnSubmittedAt = null;
        }

        return this;
    }

    get isMulligan() {
        return this.game.data.state === "MULLIGAN";
    }

    get hasConfirmedMulligan() {
        const mulligan = this.game.data.mulligan;
        if (!mulligan) return this.mulliganConfirmedLocally;

        if (this.me.userId === this.p1.userId) {
            return mulligan.playerOneDone || this.mulliganConfirmedLocally;
        }

        return mulligan.playerTwoDone || this.mulliganConfirmedLocally;
    }

    toggleMulliganCard(cardId: string) {
        if (this.hasConfirmedMulligan) return;

        if (this.mulliganSelectedCardIds.includes(cardId)) {
            this.mulliganSelectedCardIds = this.mulliganSelectedCardIds.filter(
                (id) => id !== cardId,
            );
            return;
        }

        this.mulliganSelectedCardIds = [...this.mulliganSelectedCardIds, cardId];
    }

    confirmMulliganLocally() {
        this.mulliganConfirmedLocally = true;
        this.mulliganSelectedCardIds = [];
    }

    get isFinished() {
        return this.game.data.state === "FINISHED";
    }

    get p1() {
        return this.game.data.playerOne;
    }

    get p2() {
        return this.game.data.playerTwo;
    }

    get opponent(): GamePlayer {
        if (this.p1.userId === this.user.id) return this.p2;

        return this.p1;
    }

    get me(): GamePlayer {
        if (this.p1.userId === this.user.id) return this.p1;

        return this.p2;
    }

    get goesFirst() {
        return this.me.userId === this.p1.userId;
    }

    get winner() {
        if (this.p1.health <= 0) return this.p2;

        return this.p1;
    }

    get isUserWinner() {
        return this.winner.userId === this.user.id;
    }

    get isMyTurn() {
        const gameState = this.game.data.state;
        const p1 = this.game.data.playerOne;
        const p2 = this.game.data.playerTwo;

        if (gameState === "PLAYER_ONE_TURN") {
            return p1.userId === this.user.id;
        }

        if (gameState === "PLAYER_TWO_TURN") {
            return p2.userId === this.user.id;
        }

        return false;
    }

    get isPassTurnPending() {
        if (!this.passTurnSubmittedAt) return false;

        return (
            this.game.data.state === this.passTurnSubmittedAt.state &&
            this.game.data.currentRound === this.passTurnSubmittedAt.round
        );
    }

    get canPassTurn() {
        return this.isMyTurn && !this.isPassTurnPending;
    }

    get isCardDetailHoverDisabled(): boolean {
        const { cardDragStore, targetSelectionStore, minionDragStore, weaponDragStore } = this;

        return (
            cardDragStore.cardDragged !== null ||
            cardDragStore.isShowingMinionPlayHint ||
            targetSelectionStore.isArmed ||
            targetSelectionStore.hasPendingSpellDrag ||
            targetSelectionStore.isSelectingTarget ||
            minionDragStore.isAttacking ||
            weaponDragStore.isAttacking
        );
    }

    requestPassTurn() {
        if (!this.canPassTurn) return;

        if (!isSocketReady()) {
            notifyError("Connexion perdue, reconnexion en cours...");
            return;
        }

        this.passTurnSubmittedAt = {
            state: this.game.data.state,
            round: this.game.data.currentRound,
        };
        CLIENT_SOCKET.emit("pass_turn");
    }

    handleDrop(boardIndex: number | null, spotOwner: SpotOwner) {
        const board = spotOwner === "OPPONENT" ? this.opponent.board : this.me.board;
        const actionTarget = {
            minionUuid: boardIndex === null ? null : board[boardIndex]?.uuid ?? null,
            owner: spotOwner,
        };

        if (this.targetSelectionStore.tryConfirmArmedTarget(actionTarget)) {
            return;
        }

        if (this.targetSelectionStore.isSelectingTarget) {
            return this.targetSelectionStore.confirmTarget(actionTarget);
        }

        if (this.minionDragStore.isAttacking) {
            return this.minionDragStore.confirmTarget(actionTarget);
        }

        if (this.weaponDragStore.isAttacking) {
            return this.weaponDragStore.confirmTarget(actionTarget);
        }
    }

    handleBoardIndexDrop(boardIndex: number, spotOwner: SpotOwner) {
        const pendingMinion = this.cardDragStore.pendingMinionCard;
        if (pendingMinion) {
            this.cardDragStore.handleDrop(pendingMinion, boardIndex, spotOwner);
            return;
        }

        if (this.cardDragStore.cardDragged) {
            this.cardDragStore.handleDrop(this.cardDragStore.cardDragged, boardIndex, spotOwner);
        }
    }

    getMinionBoardBackgroundColor(boardIndex: number, spotOwner: SpotOwner) {
        if (this.targetSelectionStore.isHighlightingTargets) {
            return this.targetSelectionStore.getMinionBoardBorderColor(
                boardIndex,
                spotOwner === "OPPONENT",
            );
        }

        if (this.minionDragStore.isAttacking) {
            if (spotOwner === "OPPONENT")
                return this.minionDragStore.opponentSlotsBorderColor[boardIndex];
            return this.minionDragStore.mySlotsBorderColor[boardIndex];
        }

        if (this.weaponDragStore.isAttacking) {
            if (spotOwner === "OPPONENT")
                return this.weaponDragStore.opponentSlotsBorderColor[boardIndex];
            return "black";
        }

        return "black";
    }

    getMinionBoardTargetHighlight(boardIndex: number, spotOwner: SpotOwner): TargetHighlight {
        if (this.targetSelectionStore.isHighlightingTargets) {
            return colorToTargetHighlight(
                this.targetSelectionStore.getMinionBoardBorderColor(
                    boardIndex,
                    spotOwner === "OPPONENT",
                ),
            );
        }

        if (this.minionDragStore.isAttacking) {
            const color =
                spotOwner === "OPPONENT"
                    ? this.minionDragStore.opponentSlotsBorderColor[boardIndex]
                    : this.minionDragStore.mySlotsBorderColor[boardIndex];
            return colorToTargetHighlight(color);
        }

        if (this.weaponDragStore.isAttacking && spotOwner === "OPPONENT") {
            return colorToTargetHighlight(
                this.weaponDragStore.opponentSlotsBorderColor[boardIndex],
            );
        }

        return "none";
    }

    getHeroTargetHighlight(isOpponent: boolean): TargetHighlight {
        const targetSelectionColor = this.targetSelectionStore.getHeroBorderColor(isOpponent);
        if (targetSelectionColor !== TRANSPARENT) {
            return colorToTargetHighlight(targetSelectionColor);
        }

        const weaponAttackColor = this.weaponDragStore.getOpponentHeroBorderColor(isOpponent);
        if (weaponAttackColor !== TRANSPARENT) {
            return colorToTargetHighlight(weaponAttackColor);
        }

        const minionAttackColor = this.minionDragStore.getPlayerBorderColor(isOpponent);
        return colorToTargetHighlight(minionAttackColor);
    }
}
