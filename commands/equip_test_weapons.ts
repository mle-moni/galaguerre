import { BaseCommand, args } from "@adonisjs/core/ace";
import { generatePlayerCards } from "#controllers/games/generate_player_cards";
import { instantiateWeapon } from "#controllers/games/play_card/instantiate_weapon";
import Card from "#models/card";
import Game from "#models/game";
import User from "#models/user";

export default class EquipTestWeapons extends BaseCommand {
    static commandName = "dev:equip-test-weapons";
    static description = "Equip both players with a weapon in a local training game";
    static options = {
        startApp: true,
    };

    @args.string({ description: "Email of the player in the active training game" })
    declare email: string;

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

        const weaponModel = await Card.find(106);
        if (!weaponModel) {
            this.logger.error("The test weapon card (106) is missing");
            this.exitCode = 1;
            return;
        }

        const [playerOneWeapon] = generatePlayerCards([weaponModel], { shuffle: false });
        const [playerTwoWeapon] = generatePlayerCards([weaponModel], { shuffle: false });

        if (playerOneWeapon.type !== "WEAPON" || playerTwoWeapon.type !== "WEAPON") {
            this.logger.error("The test card (106) is not a weapon");
            this.exitCode = 1;
            return;
        }

        game.data = {
            ...game.data,
            playerOne: {
                ...game.data.playerOne,
                weaponState: instantiateWeapon(playerOneWeapon),
            },
            playerTwo: {
                ...game.data.playerTwo,
                weaponState: instantiateWeapon(playerTwoWeapon),
            },
        };

        await game.save();
        this.logger.success(`Equipped both players in training game ${game.id}`);
    }
}
