import type { PlayerCard } from "#api_types/game.types";
import Game from "#models/game";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { randomIntInRange } from "../../utils/random.js";
import { isSimulating } from "../../utils/simulation_context.js";
import { createDiscoverPicker } from "./advanced/score_discover_option.js";
import { isExpertAi, usesSearchAi } from "./get_ai_difficulty.js";
import { resolveDiscoverChoice } from "../discover/resolve_discover_choice.js";
import { findPlayerByUserId } from "../discover/discover_types.js";
import { runGameActionWithNarrative } from "../game_narrative/run_game_action_with_narrative.js";
import { terminateGame } from "#controllers/games/terminate_game";

/**
 * Une découverte IA en vol par partie, exposée sous forme de promesse : la boucle de tour doit
 * pouvoir l'attendre au lieu de rendre la main (voir `waitForAiDiscovers`).
 */
const runningAiDiscovers = new Map<number, Promise<void>>();

/** Garde-fou : une carte enchaîne au plus quelques découvertes (Zoothérapie en enchaîne deux). */
const MAX_CHAINED_AI_DISCOVERS = 10;

/** L'IA débutante tire au hasard ; l'avancée note chaque option. */
const pickAiDiscoverOption = (game: Game, options: PlayerCard[]): PlayerCard => {
    if (!usesSearchAi(game)) {
        return options[randomIntInRange(0, options.length - 1)]!;
    }

    const pick = createDiscoverPicker(TRAINING_AI_USER_ID, game.data.aiDeckProfile, {
        omniscient: isExpertAi(game),
    });

    return pick(options, game.data);
};

export const isAiDiscoverPending = (game: Game): boolean => {
    const pending = game.data.pendingDiscover;
    return pending?.playerUserId === TRAINING_AI_USER_ID;
};

/** Lance (ou récupère) la résolution des découvertes IA de cette partie. */
const startAiDiscovers = (gameId: number): Promise<void> => {
    const running = runningAiDiscovers.get(gameId);
    if (running) return running;

    const promise = runAiDiscovers(gameId)
        .catch((error) => {
            console.error(`AI discover failed for game ${gameId}:`, error);
        })
        .finally(() => {
            runningAiDiscovers.delete(gameId);
        });

    runningAiDiscovers.set(gameId, promise);

    return promise;
};

export const scheduleAiDiscoverIfNeeded = (game: Game): void => {
    if (isSimulating()) return;
    if (!game.data.isTraining || !isAiDiscoverPending(game)) return;

    void startAiDiscovers(game.id);
};

/**
 * Identifie la découverte en attente, pour repérer un cycle qui n'a rien fait avancer.
 * `null` quand plus rien n'est en attente.
 */
const pendingDiscoverSignature = (game: Game): string | null => {
    const pending = game.data.pendingDiscover;
    if (!pending) return null;

    return `${pending.playerUserId}:${pending.options.map((option) => option.uuid).join(",")}`;
};

/**
 * Attend que l'IA ait choisi, découverte enchaînée comprise, et rafraîchit `game`.
 *
 * La boucle de tour s'en sert pour reprendre là où elle en était : sans ça elle rendrait la main
 * sur une découverte en attente et plus personne ne relancerait le tour avant le minuteur.
 */
export const waitForAiDiscovers = async (game: Game): Promise<void> => {
    for (let step = 0; step < MAX_CHAINED_AI_DISCOVERS; step++) {
        const before = pendingDiscoverSignature(game);
        const running = runningAiDiscovers.get(game.id);

        if (running) {
            await running;
        } else {
            if (!isAiDiscoverPending(game)) return;
            await startAiDiscovers(game.id);
        }

        await game.refresh();
        if (!isAiDiscoverPending(game)) return;

        // Découverte inchangée après un cycle complet : personne ne la résoudra (options vides,
        // joueur introuvable...). Insister ne ferait que marteler la base sans jamais progresser.
        if (pendingDiscoverSignature(game) === before) return;
    }
};

/**
 * Résout les découvertes de l'IA les unes après les autres : une carte peut en enchaîner
 * plusieurs (Zoothérapie), et le choix effectué en repose immédiatement une nouvelle.
 */
const runAiDiscovers = async (gameId: number): Promise<void> => {
    const game = await Game.findOrFail(gameId);

    for (let step = 0; step < MAX_CHAINED_AI_DISCOVERS; step++) {
        await game.refresh();

        if (!isAiDiscoverPending(game)) return;

        const pending = game.data.pendingDiscover;
        if (!pending || pending.options.length === 0) return;

        const cardUuid = pickAiDiscoverOption(game, pending.options).uuid;
        const player = findPlayerByUserId(game, pending.playerUserId);
        if (!player) return;

        let gameOver = false;

        await runGameActionWithNarrative(game, async () => {
            const { gameEnded } = resolveDiscoverChoice(game, player, cardUuid);

            if (gameEnded) {
                gameOver = true;
                await terminateGame(game, { skipSendUpdate: true });
            }
        });

        if (gameOver) return;
    }
};
