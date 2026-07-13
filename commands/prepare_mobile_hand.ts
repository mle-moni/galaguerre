import { BaseCommand, args, flags } from "@adonisjs/core/ace";
import { generatePlayerCards } from "#controllers/games/generate_player_cards";
import { instantiateMinion } from "#controllers/games/play_card/instantiate_minion";
import { instantiateWeapon } from "#controllers/games/play_card/instantiate_weapon";
import Card from "#models/card";
import Game from "#models/game";
import User from "#models/user";

const HAND_CARD_IDS = [62, 98, 106, 133, 62, 98, 106, 133, 65, 62];
const TEST_WEAPON_ID = 106;
const TEST_TARGET_MINION_ID = 62;

export default class PrepareMobileHand extends BaseCommand {
    static commandName = "dev:prepare-mobile-hand";
    static description = "Prepare a deterministic ten-card hand for local mobile interaction tests";
    static options = {
        startApp: true,
    };

    @args.string({ description: "Email of the player in the active training game" })
    declare email: string;

    @flags.number({ description: "Mana available to the human player", default: 10 })
    declare mana: number;

    async run() {
        if (this.app.nodeEnvironment === "production") {
            this.logger.error("This command is disabled in production");
            this.exitCode = 1;
            return;
        }

        const user = await User.findBy("email", this.email);
        if (!user) {
            this.logger.error(`No user found for ${this.email}`);
            this.exitCode = 1;
            return;
        }

        const game = await Game.query()
            .where((query) => query.where("playerOneId", user.id).orWhere("playerTwoId", user.id))
            .andWhere("isFinished", false)
            .first();

        if (!game?.data.isTraining) {
            this.logger.error("No active training game found for this user");
            this.exitCode = 1;
            return;
        }

        if (!Number.isInteger(this.mana) || this.mana < 0 || this.mana > 10) {
            this.logger.error("Mana must be an integer between 0 and 10");
            this.exitCode = 1;
            return;
        }

        const requiredIds = [...new Set(HAND_CARD_IDS)];
        const models = await Card.query().whereIn("id", requiredIds);
        const modelById = new Map(models.map((card) => [card.id, card]));
        const sourceCards = HAND_CARD_IDS.map((id) => modelById.get(id));

        if (sourceCards.some((card) => card === undefined)) {
            this.logger.error("One or more mobile hand test cards are missing");
            this.exitCode = 1;
            return;
        }

        const hand = generatePlayerCards(
            sourceCards.filter((card): card is Card => card !== undefined),
            { shuffle: false },
        );
        const weaponModel = modelById.get(TEST_WEAPON_ID)!;
        const targetMinionModel = modelById.get(TEST_TARGET_MINION_ID)!;
        const [humanWeapon, opponentWeapon] = generatePlayerCards([weaponModel, weaponModel], {
            shuffle: false,
        });
        const [targetMinionCard] = generatePlayerCards([targetMinionModel], { shuffle: false });

        if (
            humanWeapon.type !== "WEAPON" ||
            opponentWeapon.type !== "WEAPON" ||
            targetMinionCard.type !== "MINION"
        ) {
            this.logger.error("The mobile hand test fixture has invalid card types");
            this.exitCode = 1;
            return;
        }

        const isPlayerOne = game.data.playerOne.userId === user.id;
        const human = isPlayerOne ? game.data.playerOne : game.data.playerTwo;
        const opponent = isPlayerOne ? game.data.playerTwo : game.data.playerOne;
        const currentRound = 10;

        const preparedHuman = {
            ...human,
            hand,
            board: [],
            mana: this.mana,
            health: 30,
            weaponState: instantiateWeapon(humanWeapon),
        };
        const preparedOpponent = {
            ...opponent,
            board: [instantiateMinion(targetMinionCard, currentRound - 1)],
            mana: 10,
            health: 30,
            weaponState: instantiateWeapon(opponentWeapon),
        };

        game.data = {
            ...game.data,
            state: isPlayerOne ? "PLAYER_ONE_TURN" : "PLAYER_TWO_TURN",
            currentRound,
            playerOne: isPlayerOne ? preparedHuman : preparedOpponent,
            playerTwo: isPlayerOne ? preparedOpponent : preparedHuman,
            pendingDiscover: undefined,
            mulligan: undefined,
            mulliganEndsAt: undefined,
            turnEndsAt: Date.now() + 5 * 60 * 1000,
        };

        await game.save();
        this.logger.success(`Prepared ten-card mobile hand in training game ${game.id}`);
    }
}
