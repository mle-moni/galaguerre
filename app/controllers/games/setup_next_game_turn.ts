import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { sendGameUpdate } from "./send_game_update.js";
import { terminateGame } from "./terminate_game.js";

const MAX_MANA = 10;

export const setupNextGameTurn = async (game: Game) => {
    const nextState = getWhoIsNext(game);

    game.data.state = nextState;

    const p1 = game.data.playerOne;
    const p2 = game.data.playerTwo;

    const player = nextState === "PLAYER_ONE_TURN" ? p1 : p2;

    if (nextState === "PLAYER_ONE_TURN") {
        game.data.currentRound++;
    }

    player.mana = game.data.currentRound;
    if (player.mana > MAX_MANA) player.mana = MAX_MANA;

    const newCardToDraw = player.deckCards.shift();
    if (!newCardToDraw) {
        // fatigue damage
        const fatigueDamage = getFatigueDamage(player);
        player.health -= fatigueDamage;
        player.maxFatigueDamageTaken = fatigueDamage;
    } else {
        player.hand.push(newCardToDraw);
    }

    if (p1.health <= 0 || p2.health <= 0) {
        await terminateGame(game);
        return;
    }

    await game.save();

    sendGameUpdate(game);
};

const getWhoIsNext = (game: Game): "PLAYER_ONE_TURN" | "PLAYER_TWO_TURN" => {
    if (game.data.state === "INIT") return "PLAYER_ONE_TURN";
    if (game.data.state === "PLAYER_ONE_TURN") return "PLAYER_TWO_TURN";

    return "PLAYER_ONE_TURN";
};

const getFatigueDamage = (player: GamePlayer) => {
    return player.maxFatigueDamageTaken + 1;
};
