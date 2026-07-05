import type { GamePlayer } from "#api_types/game.types";
import { GameStatsTable } from "~/components/game_stats_table";
import { getPlayerStats } from "~/helpers/player_stats";

interface GameFinalStatsTableProps {
    me: GamePlayer;
    opponent: GamePlayer;
    winnerUserId: number;
    highlightUserId?: number;
}

export const GameFinalStatsTable = ({
    me,
    opponent,
    winnerUserId,
    highlightUserId,
}: GameFinalStatsTableProps) => (
    <GameStatsTable
        playerA={{
            userId: me.userId,
            pseudo: me.pseudo,
            stats: getPlayerStats(me),
        }}
        playerB={{
            userId: opponent.userId,
            pseudo: opponent.pseudo,
            stats: getPlayerStats(opponent),
        }}
        winnerUserId={winnerUserId}
        highlightUserId={highlightUserId ?? me.userId}
        onParchmentBackground
    />
);
