import type { GameLogEntry, GamePlayer, GamePlayerStats } from "#api_types/game.types";
import Game from "#models/game";
import UserDailyQuest from "#models/user_daily_quest";
import { getOrGenerateDailyQuests } from "#services/daily_quests/get_or_generate_daily_quests";
import { getWinnerUserId } from "#services/elo";
import { gameQualifiesForRewards } from "#services/rewards/game_qualifies_for_rewards";
import {
    hasDailyQuestsBeenApplied,
    syncProgressionMarkersFromPersisted,
} from "#services/post_game/progression_idempotency";
import { TRAINING_AI_USER_ID } from "#services/training/training_constants";
import { DateTime } from "luxon";
import db from "@adonisjs/lucid/services/db";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

const isHumanUserId = (userId: number): boolean => userId !== TRAINING_AI_USER_ID;

const getStatIncrement = (
    questType: UserDailyQuest["questType"],
    stats: GamePlayerStats,
): number => {
    switch (questType) {
        case "PLAY_MINIONS":
            return stats.minionsPlayed;
        case "DEAL_DAMAGE":
            return stats.damageDealt;
        case "DRAW_CARDS":
            return stats.cardsDrawn;
        case "HEAL_HP":
            return stats.healingDone;
        case "CAST_SPELLS":
            return stats.spellsCast;
        case "HERO_ATTACKS":
            return stats.heroAttacks;
        case "SPEND_MANA":
            return stats.manaSpent;
        default:
            return 0;
    }
};

const playerPlayedCard = (actionLog: GameLogEntry[], playerId: number, cardId: number): boolean =>
    actionLog.some(
        (entry) =>
            entry.playerId === playerId &&
            entry.type === "PLAY_CARD" &&
            entry.card?.cardId === cardId,
    );

const applyQuestProgress = (quest: UserDailyQuest, increment: number): void => {
    if (quest.claimedAt || increment <= 0) return;

    const remaining = quest.targetValue - quest.progress;
    if (remaining <= 0) return;

    quest.progress = Math.min(quest.targetValue, quest.progress + increment);

    if (quest.progress >= quest.targetValue && !quest.completedAt) {
        quest.completedAt = DateTime.now();
    }
};

const updateQuestsForPlayer = (
    quests: UserDailyQuest[],
    player: GamePlayer,
    isWinner: boolean,
    actionLog: GameLogEntry[],
): void => {
    for (const quest of quests) {
        if (quest.claimedAt) continue;

        switch (quest.questType) {
            case "WIN_GAME":
            case "WIN_GAMES":
                if (isWinner) {
                    applyQuestProgress(quest, 1);
                }
                break;
            case "WIN_WITH_CARD": {
                const cardId = quest.params?.cardId;
                if (isWinner && cardId && playerPlayedCard(actionLog, player.userId, cardId)) {
                    applyQuestProgress(quest, 1);
                }
                break;
            }
            case "OPEN_PACK":
                break;
            default:
                applyQuestProgress(quest, getStatIncrement(quest.questType, player.stats));
                break;
        }
    }
};

const saveUpdatedQuests = async (
    quests: UserDailyQuest[],
    client: TransactionClientContract,
): Promise<void> => {
    for (const quest of quests) {
        if (quest.$isDirty) {
            quest.useTransaction(client);
            await quest.save();
        }
    }
};

export const updateDailyQuestProgressForGame = async (
    game: Game,
    client?: TransactionClientContract,
): Promise<void> => {
    if (!(game instanceof Game)) return;

    if (!client) {
        return db.transaction((trx) => updateDailyQuestProgressForGame(game, trx));
    }

    const persistedGame = await Game.query({ client })
        .where("id", game.id)
        .forUpdate()
        .firstOrFail();
    syncProgressionMarkersFromPersisted(game, persistedGame.data);
    if (hasDailyQuestsBeenApplied(persistedGame.data)) {
        return;
    }

    if (!gameQualifiesForRewards(game)) {
        game.data = {
            ...game.data,
            dailyQuestProgressApplied: true,
        };
        game.useTransaction(client);
        await game.save();
        return;
    }

    const winnerUserId = getWinnerUserId(game);
    const humanPlayers = [game.data.playerOne, game.data.playerTwo]
        .filter((player) => isHumanUserId(player.userId))
        .sort((left, right) => left.userId - right.userId);

    if (humanPlayers.length === 0) return;

    for (const player of humanPlayers) {
        const quests = await getOrGenerateDailyQuests(player.userId, client);
        const activeQuests = quests.filter((quest) => !quest.claimedAt);
        const isWinner = winnerUserId === player.userId;

        updateQuestsForPlayer(activeQuests, player, isWinner, game.data.actionLog);
        await saveUpdatedQuests(activeQuests, client);
    }

    game.data = {
        ...game.data,
        dailyQuestProgressApplied: true,
    };
    game.useTransaction(client);
    await game.save();
};

export const updateDailyQuestProgressForPackOpen = async (
    userId: number,
    openedCount = 1,
    client?: TransactionClientContract,
): Promise<void> => {
    if (!client) {
        return db.transaction((trx) =>
            updateDailyQuestProgressForPackOpen(userId, openedCount, trx),
        );
    }

    const quests = await getOrGenerateDailyQuests(userId, client);
    const activeQuests = quests.filter(
        (quest) => !quest.claimedAt && quest.questType === "OPEN_PACK",
    );

    for (const quest of activeQuests) {
        applyQuestProgress(quest, openedCount);
    }

    await saveUpdatedQuests(activeQuests, client);
};
