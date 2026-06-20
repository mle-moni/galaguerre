import type { CardFilterSnapshot, GamePlayer } from "#api_types/game.types";
import { deckCardMatchesFilter } from "#api_types/card_filter_matching";
import type Game from "#models/game";
import { applyDamageToHero } from "./action_engine/apply_damage_to_hero.js";
import { recordCardDraw, recordFatigueDamage } from "./game_log/record_game_log.js";
import { recordCardDrawn } from "./game_stats/record_player_stats.js";
import { triggerPassives } from "./passive_engine/trigger_passives.js";
import { beginLoggedBeat, endCurrentBeat } from "./game_narrative/narrative_beats.js";
import { resolveSpotOwner } from "./game_narrative/narrative_effects.js";
import { withNarrativeRecorder } from "./game_narrative/narrative_context.js";

export const getFatigueDamage = (player: GamePlayer) => player.maxFatigueDamageTaken + 1;

const triggerDrawPassives = (game: Game | undefined, drawingPlayer: GamePlayer): void => {
    if (!game) return;
    triggerPassives(game, "DRAW", drawingPlayer);
};

const recordFatigueBeat = (game: Game, player: GamePlayer, fatigueDamage: number): void => {
    const owner = resolveSpotOwner(game, player);
    withNarrativeRecorder((recorder) => {
        beginLoggedBeat(game, "FATIGUE");
        recorder.recordEffect({ type: "FATIGUE", owner, amount: fatigueDamage });
        endCurrentBeat(game);
    });
};

const recordDrawBeat = (game: Game, player: GamePlayer, cardUuid?: string): void => {
    const owner = resolveSpotOwner(game, player);
    withNarrativeRecorder((recorder) => {
        beginLoggedBeat(game, "DRAW");
        recorder.recordEffect({ type: "DRAW", owner, cardUuid });
        endCurrentBeat(game);
    });
};

export const drawOneCard = (
    player: GamePlayer,
    filter?: CardFilterSnapshot | null,
    game?: Game,
): void => {
    if (!filter) {
        const card = player.deckCards.shift();
        if (!card) {
            const fatigueDamage = getFatigueDamage(player);
            player.maxFatigueDamageTaken = fatigueDamage;
            if (game) {
                recordFatigueDamage(game, player, fatigueDamage);
                recordFatigueBeat(game, player, fatigueDamage);
                applyDamageToHero(game, player, fatigueDamage, player);
            } else {
                player.health -= fatigueDamage;
            }
        } else {
            player.hand.push(card);
            recordCardDrawn(player);
            if (game) recordCardDraw(game, player, card);
            if (game) recordDrawBeat(game, player, card.uuid);
            triggerDrawPassives(game, player);
        }
        return;
    }

    if (player.deckCards.length === 0) {
        const fatigueDamage = getFatigueDamage(player);
        player.maxFatigueDamageTaken = fatigueDamage;
        if (game) {
            recordFatigueDamage(game, player, fatigueDamage);
            recordFatigueBeat(game, player, fatigueDamage);
            applyDamageToHero(game, player, fatigueDamage, player);
        } else {
            player.health -= fatigueDamage;
        }
        return;
    }

    const matchIndex = player.deckCards.findIndex((card) => deckCardMatchesFilter(card, filter));
    if (matchIndex === -1) return;

    const [card] = player.deckCards.splice(matchIndex, 1);
    player.hand.push(card!);
    recordCardDrawn(player);
    if (game) recordCardDraw(game, player, card!);
    if (game) recordDrawBeat(game, player, card!.uuid);
    triggerDrawPassives(game, player);
};

export const drawCards = (
    player: GamePlayer,
    count: number,
    filter?: CardFilterSnapshot | null,
    game?: Game,
): void => {
    for (let i = 0; i < count; i++) drawOneCard(player, filter, game);
};
