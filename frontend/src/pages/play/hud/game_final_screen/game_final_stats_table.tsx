import type { GamePlayer } from "#api_types/game.types";
import { Table, Text } from "@mantine/core";
import { getPlayerStats, STAT_ROWS } from "~/helpers/player_stats";

interface GameFinalStatsTableProps {
    me: GamePlayer;
    opponent: GamePlayer;
    winnerUserId: number;
}

export const GameFinalStatsTable = ({ me, opponent, winnerUserId }: GameFinalStatsTableProps) => {
    const myStats = getPlayerStats(me);
    const opponentStats = getPlayerStats(opponent);
    const meIsWinner = me.userId === winnerUserId;
    const opponentIsWinner = opponent.userId === winnerUserId;

    return (
        <Table striped highlightOnHover withTableBorder withColumnBorders mt="md">
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Statistique</Table.Th>
                    <Table.Th
                        style={{
                            fontWeight: meIsWinner ? 700 : undefined,
                            backgroundColor: meIsWinner ? "rgba(34, 139, 34, 0.12)" : undefined,
                        }}
                    >
                        Vous ({me.pseudo})
                    </Table.Th>
                    <Table.Th
                        style={{
                            fontWeight: opponentIsWinner ? 700 : undefined,
                            backgroundColor: opponentIsWinner
                                ? "rgba(34, 139, 34, 0.12)"
                                : undefined,
                        }}
                    >
                        {opponent.pseudo}
                    </Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {STAT_ROWS.map(({ key, label }) => {
                    const myValue = myStats[key];
                    const opponentValue = opponentStats[key];
                    const myLeads = myValue > opponentValue;
                    const opponentLeads = opponentValue > myValue;

                    return (
                        <Table.Tr key={key}>
                            <Table.Td>
                                <Text size="sm">{label}</Text>
                            </Table.Td>
                            <Table.Td>
                                <Text
                                    size="sm"
                                    fw={myLeads ? 700 : undefined}
                                    c={myLeads ? "teal" : undefined}
                                >
                                    {myValue}
                                </Text>
                            </Table.Td>
                            <Table.Td>
                                <Text
                                    size="sm"
                                    fw={opponentLeads ? 700 : undefined}
                                    c={opponentLeads ? "teal" : undefined}
                                >
                                    {opponentValue}
                                </Text>
                            </Table.Td>
                        </Table.Tr>
                    );
                })}
            </Table.Tbody>
        </Table>
    );
};
