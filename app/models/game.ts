import type { ApiGame, GameData, GamePlayer, PlayerCard } from "#api_types/game.types";
import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import type { DateTime } from "luxon";
import User from "./user.js";

export default class Game extends BaseModel {
    @column({ isPrimary: true })
    declare id: number;

    @column()
    declare playerOneId: number;

    @belongsTo(() => User, { foreignKey: "playerOneId" })
    declare playerOne: BelongsTo<typeof User>;

    @column()
    declare playerTwoId: number;

    @belongsTo(() => User, { foreignKey: "playerTwoId" })
    declare playerTwo: BelongsTo<typeof User>;

    @column()
    declare data: GameData;

    @column()
    declare isFinished: boolean;

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime;

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime;

    getApiJson(forUserId: number): ApiGame {
        const p1 = this.data.playerOne;
        const p2 = this.data.playerTwo;
        const playerOne: GamePlayer = hidePlayerData(p1, forUserId);
        const playerTwo: GamePlayer = hidePlayerData(p2, forUserId);
        const data: GameData = {
            ...this.data,
            playerOne,
            playerTwo,
        };

        return {
            id: this.id,
            playerOneId: this.playerOneId,
            playerTwoId: this.playerTwoId,
            data,
            isFinished: this.isFinished,
            createdAt: this.createdAt.toISO()!,
            updatedAt: this.updatedAt.toISO()!,
        };
    }
}

const hidePlayerData = (player: GamePlayer, forUserId: number): GamePlayer => {
    const deckCards = player.deckCards.map(hideCardData);
    const hiddenHand = player.hand.map(hideCardData);

    return {
        ...player,
        deckCards,
        hand: player.userId === forUserId ? player.hand : hiddenHand,
    };
};

const hideCardData = (card: PlayerCard): PlayerCard => ({
    type: "MINION",
    attack: 0,
    health: 0,
    cost: 0,
    label: "dummy card",
    imageUrl: "https://picsum.photos/seed/dummy_card/200/300",
    uuid: card.uuid,
    cardId: 0,
});
