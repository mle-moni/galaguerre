import type {
    ApiDevStatsV1Card,
    ApiDevStatsV1ModeStats,
    ApiDevCardsStatsPayload,
} from "#api_types/dev_stats.types";
import type { CardRarity } from "#api_types/card_rarity.types";
import type { GameData, GameWinnerSide } from "#api_types/game.types";
import Card from "#models/card";
import Game from "#models/game";
import db from "@adonisjs/lucid/services/db";

export const DEV_STATS_V1_GAMES_LIMIT = 5000;

type ModeAccumulator = {
    playedGames: number;
    wins: number;
};

type CardAccumulator = {
    human: ModeAccumulator;
    ai: ModeAccumulator;
};

type LiveDeckRow = {
    card_id: number;
    deck_count: string | number;
    total_copies: string | number;
};

const emptyMode = (): ModeAccumulator => ({ playedGames: 0, wins: 0 });

const toModeStats = (acc: ModeAccumulator): ApiDevStatsV1ModeStats => ({
    playedGames: acc.playedGames,
    winrate: acc.playedGames === 0 ? null : acc.wins / acc.playedGames,
});

export const resolveWinnerSideFromData = (data: GameData): GameWinnerSide | null => {
    if (data.winnerSide !== undefined) {
        return data.winnerSide;
    }

    const { playerOne, playerTwo } = data;
    if (playerOne.health <= 0 && playerTwo.health <= 0) {
        return null;
    }
    if (playerOne.health <= 0) {
        return "PLAYER_TWO";
    }
    if (playerTwo.health <= 0) {
        return "PLAYER_ONE";
    }
    return null;
};

export const collectPlayedCardIdsForPlayer = (
    data: GameData,
    playerUserId: number,
): Set<number> => {
    const played = new Set<number>();
    for (const entry of data.actionLog) {
        if (entry.type !== "PLAY_CARD" || entry.playerId !== playerUserId || !entry.card) {
            continue;
        }
        played.add(entry.card.cardId);
    }
    return played;
};

const creditPlayedCards = (
    byCardId: Map<number, CardAccumulator>,
    cardIds: Set<number>,
    mode: "human" | "ai",
    won: boolean,
) => {
    for (const cardId of cardIds) {
        let acc = byCardId.get(cardId);
        if (!acc) {
            acc = { human: emptyMode(), ai: emptyMode() };
            byCardId.set(cardId, acc);
        }
        const modeAcc = acc[mode];
        modeAcc.playedGames += 1;
        if (won) {
            modeAcc.wins += 1;
        }
    }
};

const loadLiveDeckStats = async (): Promise<{
    totalDecks: number;
    byCardId: Map<number, { deckCount: number; totalCopies: number }>;
}> => {
    const totalDecksRow = await db.from("decks").count("* as total").first();
    const totalDecks = Number(totalDecksRow?.total ?? 0);

    const rows = (await db
        .from("deck_cards")
        .innerJoin("cards", "cards.id", "deck_cards.card_id")
        .where("cards.is_collectible", true)
        .groupBy("deck_cards.card_id")
        .select("deck_cards.card_id")
        .countDistinct("deck_cards.deck_id as deck_count")
        .count("* as total_copies")) as LiveDeckRow[];

    const byCardId = new Map<number, { deckCount: number; totalCopies: number }>();
    for (const row of rows) {
        byCardId.set(Number(row.card_id), {
            deckCount: Number(row.deck_count),
            totalCopies: Number(row.total_copies),
        });
    }

    return { totalDecks, byCardId };
};

const aggregateFinishedGames = async (
    byCardId: Map<number, CardAccumulator>,
): Promise<{ humanGames: number; aiGames: number; gamesScanned: number }> => {
    const games = await Game.query()
        .where("is_finished", true)
        .orderBy("id", "desc")
        .limit(DEV_STATS_V1_GAMES_LIMIT);

    let humanGames = 0;
    let aiGames = 0;

    for (const game of games) {
        const data = game.data;
        if (data.isOnboardingTutorial) {
            continue;
        }

        const winnerSide = resolveWinnerSideFromData(data);

        if (data.isTraining) {
            aiGames += 1;
            const humanIsPlayerOne = game.playerOneId !== null;
            const human = humanIsPlayerOne ? data.playerOne : data.playerTwo;
            const humanSide: GameWinnerSide = humanIsPlayerOne ? "PLAYER_ONE" : "PLAYER_TWO";
            const played = collectPlayedCardIdsForPlayer(data, human.userId);
            creditPlayedCards(byCardId, played, "ai", winnerSide === humanSide);
            continue;
        }

        if (game.playerOneId === null || game.playerTwoId === null) {
            continue;
        }

        humanGames += 1;

        const p1Played = collectPlayedCardIdsForPlayer(data, data.playerOne.userId);
        creditPlayedCards(byCardId, p1Played, "human", winnerSide === "PLAYER_ONE");

        const p2Played = collectPlayedCardIdsForPlayer(data, data.playerTwo.userId);
        creditPlayedCards(byCardId, p2Played, "human", winnerSide === "PLAYER_TWO");
    }

    return { humanGames, aiGames, gamesScanned: games.length };
};

export const computeStatsV1 = async (): Promise<ApiDevCardsStatsPayload> => {
    const [live, collectibleCards] = await Promise.all([
        loadLiveDeckStats(),
        Card.query().where("isCollectible", true).orderBy("id", "asc"),
    ]);

    const playByCardId = new Map<number, CardAccumulator>();
    const { humanGames, aiGames, gamesScanned } = await aggregateFinishedGames(playByCardId);

    const cards: ApiDevStatsV1Card[] = collectibleCards.map((card) => {
        const liveStats = live.byCardId.get(card.id);
        const playStats = playByCardId.get(card.id) ?? {
            human: emptyMode(),
            ai: emptyMode(),
        };
        const deckCount = liveStats?.deckCount ?? 0;
        const totalCopies = liveStats?.totalCopies ?? 0;

        return {
            cardId: card.id,
            label: card.data.name,
            cost: card.data.cost,
            rarity: card.rarity as CardRarity,
            liveSelectionRate: live.totalDecks === 0 ? 0 : deckCount / live.totalDecks,
            liveAvgCopies: deckCount === 0 ? null : totalCopies / deckCount,
            human: toModeStats(playStats.human),
            ai: toModeStats(playStats.ai),
        };
    });

    return {
        meta: {
            totalDecks: live.totalDecks,
            humanGames,
            aiGames,
            gamesScanned,
            gamesLimit: DEV_STATS_V1_GAMES_LIMIT,
            generatedAt: new Date().toISOString(),
        },
        cards,
    };
};
