import type { GamePlayerStats } from "#api_types/game.types";
import { Table, Text } from "@mantine/core";
import clsx from "clsx";
import { ResponsiveTable } from "~/components/responsive_table";
import { PlayerNameLink } from "~/components/player_name_link";
import { STAT_ROWS } from "~/helpers/player_stats";

export interface GameStatsTablePlayer {
    userId: number;
    pseudo: string | null;
    stats: GamePlayerStats;
}

interface GameStatsTableProps {
    playerA: GameStatsTablePlayer;
    playerB: GameStatsTablePlayer;
    winnerUserId: number | null;
    highlightUserId?: number;
    linkToHistory?: boolean;
    onDarkBackground?: boolean;
    onParchmentBackground?: boolean;
}

const renderColumnLabel = (
    player: GameStatsTablePlayer,
    highlightUserId: number | undefined,
    linkToHistory: boolean,
) => {
    const nameLink = linkToHistory ? (
        <PlayerNameLink pseudo={player.pseudo} userId={player.userId} className="text-white" />
    ) : (
        <>{player.pseudo ?? `Joueur #${player.userId}`}</>
    );

    if (highlightUserId === player.userId) {
        return <>{nameLink}</>;
    }

    return nameLink;
};

const DARK_PANEL_TABLE_PROPS = {
    stripedColor: "rgba(255, 255, 255, 0.06)",
    highlightOnHoverColor: "rgba(255, 255, 255, 0.1)",
    styles: {
        th: { color: "rgba(255,255,255,0.7)", fontWeight: 600 },
        td: { color: "white" },
    },
} as const;

const ParchmentGameStatsTable = ({
    playerA,
    playerB,
    highlightUserId,
    linkToHistory,
}: Omit<GameStatsTableProps, "onDarkBackground" | "onParchmentBackground">) => {
    return (
        <div className="game-history-stats-frame">
            <div className="game-history-stats-scroll">
                <table className="game-history-stats-table">
                    <thead>
                        <tr>
                            <th>Statistique</th>
                            <th>
                                {renderColumnLabel(
                                    playerA,
                                    highlightUserId,
                                    linkToHistory ?? false,
                                )}
                            </th>
                            <th>
                                {renderColumnLabel(
                                    playerB,
                                    highlightUserId,
                                    linkToHistory ?? false,
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {STAT_ROWS.map(({ key, label }) => {
                            const playerAValue = playerA.stats[key];
                            const playerBValue = playerB.stats[key];
                            const playerALeads = playerAValue > playerBValue;
                            const playerBLeads = playerBValue > playerAValue;

                            return (
                                <tr key={key}>
                                    <td className="game-history-stats-table__label">{label}</td>
                                    <td
                                        className={clsx(
                                            playerALeads &&
                                                "game-history-stats-table__value--leads",
                                        )}
                                    >
                                        {playerAValue}
                                    </td>
                                    <td
                                        className={clsx(
                                            playerBLeads &&
                                                "game-history-stats-table__value--leads",
                                        )}
                                    >
                                        {playerBValue}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const GameStatsTable = ({
    playerA,
    playerB,
    winnerUserId,
    highlightUserId,
    linkToHistory = false,
    onDarkBackground = false,
    onParchmentBackground = false,
}: GameStatsTableProps) => {
    if (onParchmentBackground) {
        return (
            <ParchmentGameStatsTable
                playerA={playerA}
                playerB={playerB}
                winnerUserId={winnerUserId}
                highlightUserId={highlightUserId}
                linkToHistory={linkToHistory}
            />
        );
    }

    const playerAIsWinner = winnerUserId !== null && playerA.userId === winnerUserId;
    const playerBIsWinner = winnerUserId !== null && playerB.userId === winnerUserId;

    return (
        <ResponsiveTable minWidth={400}>
            <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                mt="md"
                {...(onDarkBackground ? DARK_PANEL_TABLE_PROPS : {})}
            >
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Statistique</Table.Th>
                        <Table.Th
                            style={{
                                fontWeight: playerAIsWinner ? 700 : undefined,
                                backgroundColor: playerAIsWinner
                                    ? "rgba(34, 139, 34, 0.12)"
                                    : undefined,
                            }}
                        >
                            {renderColumnLabel(playerA, highlightUserId, linkToHistory)}
                        </Table.Th>
                        <Table.Th
                            style={{
                                fontWeight: playerBIsWinner ? 700 : undefined,
                                backgroundColor: playerBIsWinner
                                    ? "rgba(34, 139, 34, 0.12)"
                                    : undefined,
                            }}
                        >
                            {renderColumnLabel(playerB, highlightUserId, linkToHistory)}
                        </Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {STAT_ROWS.map(({ key, label }) => {
                        const playerAValue = playerA.stats[key];
                        const playerBValue = playerB.stats[key];
                        const playerALeads = playerAValue > playerBValue;
                        const playerBLeads = playerBValue > playerAValue;

                        return (
                            <Table.Tr key={key}>
                                <Table.Td>
                                    <Text size="sm">{label}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text
                                        size="sm"
                                        fw={playerALeads ? 700 : undefined}
                                        c={playerALeads ? "teal" : undefined}
                                    >
                                        {playerAValue}
                                    </Text>
                                </Table.Td>
                                <Table.Td>
                                    <Text
                                        size="sm"
                                        fw={playerBLeads ? 700 : undefined}
                                        c={playerBLeads ? "teal" : undefined}
                                    >
                                        {playerBValue}
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        );
                    })}
                </Table.Tbody>
            </Table>
        </ResponsiveTable>
    );
};
