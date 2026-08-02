import type { GameData, PlayerCard } from "#api_types/game.types";
import { findMinionInBoard, whichPlayerAmI } from "#controllers/games/game_utils";
import { minionToHeroAction } from "#controllers/games/minion_action/minion_to_hero_action";
import { minionToMinionAction } from "#controllers/games/minion_action/minion_to_minion_action";
import { performPassTurn } from "#controllers/games/pass_game_turn";
import { playMinion } from "#controllers/games/play_card/play_minion";
import { playSpell } from "#controllers/games/play_card/play_spell";
import { playWeapon } from "#controllers/games/play_card/play_weapon";
import { weaponToHeroAction } from "#controllers/games/weapon_action/weapon_to_hero_action";
import { weaponToMinionAction } from "#controllers/games/weapon_action/weapon_to_minion_action";
import type Game from "#models/game";
import type { AiMove } from "../ai/enumerate_ai_moves.js";
import { findPlayerByUserId } from "../discover/discover_types.js";
import { resolveDiscoverChoice } from "../discover/resolve_discover_choice.js";
import { cloneGameData } from "../game_narrative/clone_game_data.js";
import { runGameActionWithNarrative } from "../game_narrative/run_game_action_with_narrative.js";
import { createSimulationGame } from "./simulation_game.js";

/** Socket factice : en simulation, les erreurs éventuelles ne sont émises nulle part. */
const SIMULATION_SOCKET_ID = "ai-simulation";

/** Garde-fou contre une chaîne de discovers qui ne se terminerait pas. */
const MAX_CHAINED_DISCOVERS = 8;

export type DiscoverOptionPicker = (options: PlayerCard[], data: GameData) => PlayerCard;

const pickFirstOption: DiscoverOptionPicker = (options) => options[0]!;

export interface ApplyAiMoveResult {
    data: GameData;
    /** `true` si un héros est mort pendant le coup. */
    finished: boolean;
    /** `false` quand le coup s'est révélé illégal et n'a rien changé. */
    applied: boolean;
}

/**
 * Résout sur place les discovers déclenchés par le coup simulé, pour que la branche puisse
 * continuer au lieu de rester bloquée sur `pendingDiscover`.
 */
const resolveSimulatedDiscovers = async (
    game: Game,
    aiUserId: number,
    pickOption: DiscoverOptionPicker,
): Promise<void> => {
    for (let i = 0; i < MAX_CHAINED_DISCOVERS; i++) {
        const pending = game.data.pendingDiscover;
        if (!pending || pending.playerUserId !== aiUserId || pending.options.length === 0) return;

        const player = findPlayerByUserId(game, pending.playerUserId);
        if (!player) return;

        const chosen = pickOption(pending.options, game.data);

        await runGameActionWithNarrative(game, async () => {
            resolveDiscoverChoice(game, player, chosen.uuid);
        });

        if (game.data.playerOne.health <= 0 || game.data.playerTwo.health <= 0) {
            game.isFinished = true;
            return;
        }
    }
};

/**
 * Rejoue un coup de l'IA sur une copie de l'état, en appelant les VRAIES fonctions du moteur.
 *
 * L'appelant doit avoir ouvert un contexte de simulation (`runInSimulation`) : sans lui, les
 * effets de bord du moteur (base de données, sockets, timers) ne seraient pas neutralisés.
 * Les coups viennent de `enumerateAiMoves`, donc déjà légaux : on court-circuite la couche socket
 * de validation et on appelle directement les fonctions de résolution.
 */
export const applyAiMove = async (
    data: GameData,
    aiUserId: number,
    move: AiMove,
    pickDiscoverOption: DiscoverOptionPicker = pickFirstOption,
): Promise<ApplyAiMoveResult> => {
    const game = createSimulationGame(cloneGameData(data));
    const { player, opponent } = whichPlayerAmI(game, aiUserId);

    let applied = true;

    switch (move.type) {
        case "play_card": {
            const { cardId, boardIndex, owner, actionTarget } = move.action;
            const card = player.hand.find((handCard) => handCard.uuid === cardId);

            if (!card) {
                applied = false;
                break;
            }

            if (card.type === "MINION" && boardIndex !== null) {
                await playMinion({
                    card,
                    boardIndex,
                    owner,
                    player,
                    game,
                    socketId: SIMULATION_SOCKET_ID,
                    actionTarget,
                });
            } else if (card.type === "SPELL") {
                await playSpell({
                    card,
                    player,
                    game,
                    socketId: SIMULATION_SOCKET_ID,
                    owner,
                    boardIndex,
                    actionTarget,
                });
            } else if (card.type === "WEAPON") {
                await playWeapon({
                    card,
                    player,
                    game,
                    socketId: SIMULATION_SOCKET_ID,
                    owner,
                    boardIndex,
                });
            } else {
                applied = false;
            }
            break;
        }

        case "minion_action": {
            const { minionId, minionUuid, owner } = move.action;
            const minionInfos = findMinionInBoard(player.board, minionId, "PLAYER");

            if (!minionInfos) {
                applied = false;
                break;
            }

            if (minionUuid === null) {
                await minionToHeroAction({
                    minionInfos,
                    game,
                    player,
                    opponent,
                    owner,
                    socketId: SIMULATION_SOCKET_ID,
                });
                break;
            }

            const targetBoard = owner === "PLAYER" ? player.board : opponent.board;
            const targetInfos = findMinionInBoard(targetBoard, minionUuid, owner);

            if (!targetInfos) {
                applied = false;
                break;
            }

            await minionToMinionAction({
                minionInfos,
                game,
                player,
                opponent,
                owner,
                targetMinion: targetInfos.minion,
                socketId: SIMULATION_SOCKET_ID,
            });
            break;
        }

        case "weapon_action": {
            const { minionUuid, owner } = move.action;
            const weaponState = player.weaponState;

            if (!weaponState) {
                applied = false;
                break;
            }

            if (minionUuid === null) {
                await weaponToHeroAction({
                    weaponState,
                    game,
                    player,
                    opponent,
                    owner,
                    socketId: SIMULATION_SOCKET_ID,
                });
                break;
            }

            const targetBoard = owner === "PLAYER" ? player.board : opponent.board;
            const targetInfos = findMinionInBoard(targetBoard, minionUuid, owner);

            if (!targetInfos) {
                applied = false;
                break;
            }

            await weaponToMinionAction({
                weaponState,
                game,
                player,
                opponent,
                owner,
                targetMinion: targetInfos.minion,
                socketId: SIMULATION_SOCKET_ID,
            });
            break;
        }

        case "pass_turn": {
            await performPassTurn(game, player);
            break;
        }
    }

    if (!game.isFinished) {
        await resolveSimulatedDiscovers(game, aiUserId, pickDiscoverOption);
    }

    const finished =
        game.isFinished ||
        game.data.playerOne.health <= 0 ||
        game.data.playerTwo.health <= 0 ||
        game.data.state === "FINISHED";

    return { data: game.data, finished, applied };
};
