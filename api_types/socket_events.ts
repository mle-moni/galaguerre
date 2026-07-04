import type { ActionTarget, ApiGame, SpotOwner } from "./game.types.js";
import type { ApiGameInvite } from "./game_invite.types.js";
import type { GamePresentationUpdate } from "./game_narrative.types.js";

export interface SocketEventByKey {
    notify_error: { error: string };
    notify_success: { message: string };
    auth_error: { error: string };
    auth_success: { message: string };
    "game:created": { gameId: number };
    "game:update": { game: ApiGame; presentation?: GamePresentationUpdate };
    "game:invite_received": { invite: ApiGameInvite };
    "game:invite_cancelled": { inviteId: number };
}

export type SocketEventKey = keyof SocketEventByKey;

export interface ClientSocketEventByKey {
    "game:play_card": {
        cardId: string;
        boardIndex: number | null;
        owner: SpotOwner;
        actionTarget?: ActionTarget | null;
    };
    "game:minion_action": { minionId: string; minionUuid: string | null; owner: SpotOwner };
    "game:weapon_action": { minionUuid: string | null; owner: SpotOwner };
    "game:abandon": Record<string, never>;
    "game:mulligan": { cardIds: string[] };
    "game:discover_choice": { cardUuid: string };
    pass_turn: Record<string, never>;
}

export type ClientSocketEventKey = keyof ClientSocketEventByKey;
