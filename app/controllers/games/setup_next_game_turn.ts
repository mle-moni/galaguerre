import type { GamePlayer } from "#api_types/game.types";
import type Game from "#models/game";
import { emitSocketEvent } from "#services/sockets/emit_socket_event";
import { WsRooms } from "#services/sockets/ws_rooms";

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

    const newCardToDraw = player.deckCards.shift();
    if (!newCardToDraw) {
        // fatigue damage
        player.health -= getFatigueDamage(player);
        player.maxFatigueDamageTaken++;
    } else {
        player.hand.push(newCardToDraw);
    }

    if (player.health <= 0) {
        game.data.state = "FINISHED";
    }

    await game.save();

    emitSocketEvent(
        "game:update",
        { game: game.getApiJson(p1.userId) },
        WsRooms.personalSocketRoom(p1.userId),
    );

    emitSocketEvent(
        "game:update",
        { game: game.getApiJson(p2.userId) },
        WsRooms.personalSocketRoom(p2.userId),
    );
};

const getWhoIsNext = (game: Game): "PLAYER_ONE_TURN" | "PLAYER_TWO_TURN" => {
    if (game.data.state === "INIT") return "PLAYER_ONE_TURN";
    if (game.data.state === "PLAYER_ONE_TURN") return "PLAYER_TWO_TURN";

    return "PLAYER_ONE_TURN";
};

// fatigue damage formula
// see https://hearthstone.fandom.com/wiki/Fatigue
const getFatigueDamage = (player: GamePlayer) => {
    const n = player.maxFatigueDamageTaken;
    return (n * (n + 1)) / 2;
};
