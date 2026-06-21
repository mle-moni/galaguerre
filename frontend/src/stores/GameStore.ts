import type { ApiUser } from "#api_types/auth.types";
import type { ApiGame, GamePlayer, SpotOwner } from "#api_types/game.types";
import type { GamePresentationUpdate } from "#api_types/game_narrative.types";
import { makeAutoObservable } from "mobx";
import { _assert } from "~/helpers/assertions";
import { notifyError } from "~/services/toasts";
import { isSocketReady } from "~/services/ws_client";
import { CardDragStore } from "./CardDragStore.js";
import { CombatActionQueueStore } from "./CombatActionQueueStore.js";
import { MinionDragStore } from "./MinionDragStore.js";
import { NarrativeDirector } from "./NarrativeDirector.js";
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
    combatActionQueue = new CombatActionQueueStore(this);
    narrativeDirector = new NarrativeDirector(this);

    private _authoritativeGame: ApiGame | null = null;
    private _displayGame: ApiGame | null = null;
    private _user: ApiUser | null = null;
    isNarrativePlaying = false;
    mulliganSelectedCardIds: string[] = [];
    mulliganConfirmedLocally = false;
    private passTurnSubmittedAt: { state: ApiGame["data"]["state"]; round: number } | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get authoritativeGame() {
        _assert(this._authoritativeGame, "GameStore not initialized");
        return this._authoritativeGame;
    }

    get displayGame() {
        _assert(this._displayGame ?? this._authoritativeGame, "GameStore not initialized");
        return this._displayGame ?? this._authoritativeGame!;
    }

    get game() {
        return this.displayGame;
    }

    get user() {
        _assert(this._user, "GameStore not initialized");
        return this._user;
    }

    get isInputBlocked() {
        return this.isNarrativePlaying;
    }

    get canPlanCombatAction() {
        return this.isMyTurn;
    }

    get isCombatTargeting() {
        return this.minionDragStore.isAttacking || this.weaponDragStore.isAttacking;
    }

    get authoritativeMe(): GamePlayer {
        const { playerOne, playerTwo } = this.authoritativeGame.data;
        return playerOne.userId === this.user.id ? playerOne : playerTwo;
    }

    get authoritativeOpponent(): GamePlayer {
        const { playerOne, playerTwo } = this.authoritativeGame.data;
        return playerOne.userId === this.user.id ? playerTwo : playerOne;
    }

    setDisplayGame(game: ApiGame) {
        this._displayGame = game;
    }

    setNarrativePlaying(isPlaying: boolean) {
        this.isNarrativePlaying = isPlaying;
    }

    init(game: ApiGame, user: ApiUser): GameStore {
        const isNewGame = this._authoritativeGame?.id !== game.id;
        const leavingMulligan =
            !isNewGame &&
            this._authoritativeGame?.data.state === "MULLIGAN" &&
            game.data.state !== "MULLIGAN";

        this._user = user;

        if (isNewGame || leavingMulligan) {
            this.mulliganSelectedCardIds = [];
            this.mulliganConfirmedLocally = false;
            this.passTurnSubmittedAt = null;
            this.narrativeDirector.clear();
            this.combatActionQueue.clear();
        }

        this._authoritativeGame = game;
        this._displayGame = game;
        this.isNarrativePlaying = false;
        return this;
    }

    receiveUpdate(game: ApiGame, presentation?: GamePresentationUpdate) {
        const isNewGame = this._authoritativeGame?.id !== game.id;
        this._authoritativeGame = game;
        this.combatActionQueue.resetInFlight();

        if (presentation) {
            this.narrativeDirector.enqueue(presentation, game);
            return;
        }

        if (isNewGame) {
            this.narrativeDirector.clear();
            this.combatActionQueue.clear();
            this._displayGame = game;
            this.isNarrativePlaying = false;
            return;
        }

        if (!this.isNarrativePlaying && !this.narrativeDirector.narrativePlaying) {
            this._displayGame = game;
        }
    }

    syncFromQuery(game: ApiGame, user: ApiUser) {
        const isNewGame = this._authoritativeGame?.id !== game.id;
        if (!this._user || isNewGame) {
            this.init(game, user);
            return;
        }

        this.receiveUpdate(game);
    }

    skipNarrative() {
        this.narrativeDirector.skipCurrentScene();
        this._displayGame = this._authoritativeGame;
        this.isNarrativePlaying = false;
        this.combatActionQueue.flush();
    }

    get isMulligan() {
        return this.game.data.state === "MULLIGAN";
    }

    get hasConfirmedMulligan() {
        const mulligan = this.authoritativeGame.data.mulligan;
        if (!mulligan) return this.mulliganConfirmedLocally;

        if (this.me.userId === this.p1.userId) {
            return mulligan.playerOneDone || this.mulliganConfirmedLocally;
        }

        return mulligan.playerTwoDone || this.mulliganConfirmedLocally;
    }

    toggleMulliganCard(cardId: string) {
        if (this.hasConfirmedMulligan || this.isInputBlocked) return;

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
        const gameState = this.authoritativeGame.data.state;
        const p1 = this.authoritativeGame.data.playerOne;
        const p2 = this.authoritativeGame.data.playerTwo;

        if (gameState === "PLAYER_ONE_TURN") {
            return p1.userId === this.user.id;
        }

        if (gameState === "PLAYER_TWO_TURN") {
            return p2.userId === this.user.id;
        }

        return false;
    }

    get isPassTurnPending() {
        if (this.combatActionQueue.isPassTurnReserved()) return true;
        if (!this.passTurnSubmittedAt) return false;

        return (
            this.authoritativeGame.data.state === this.passTurnSubmittedAt.state &&
            this.authoritativeGame.data.currentRound === this.passTurnSubmittedAt.round
        );
    }

    get canPassTurn() {
        return this.isMyTurn && !this.isPassTurnPending;
    }

    markPassTurnSubmitted() {
        this.passTurnSubmittedAt = {
            state: this.authoritativeGame.data.state,
            round: this.authoritativeGame.data.currentRound,
        };
    }

    get isCardDetailHoverDisabled(): boolean {
        const { cardDragStore, targetSelectionStore, minionDragStore, weaponDragStore } = this;

        return (
            (this.isInputBlocked && !this.isCombatTargeting) ||
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

        this.combatActionQueue.enqueuePassTurn();
    }

    handleDrop(boardIndex: number | null, spotOwner: SpotOwner) {
        if (this.isInputBlocked && !this.isCombatTargeting) return;

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
        if (this.isInputBlocked) return;

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
