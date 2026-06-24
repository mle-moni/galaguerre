import type { GameRewardPlayerResult } from "#api_types/rewards.types";
import { Paper, Stack, Text } from "@mantine/core";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";

interface GameLootSectionProps {
    reward: GameRewardPlayerResult;
}

export const GameLootSection = ({ reward }: GameLootSectionProps) => {
    if (reward.goldCoins === 0 && reward.packs === 0) {
        return null;
    }

    return (
        <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
                <Text fw={600}>Butin</Text>
                {reward.goldCoins > 0 ? (
                    <GoldCoinAmount amount={reward.goldCoins} prefix="+" iconSize={20} />
                ) : null}
                {reward.packs > 0 ? <Text size="sm">+{reward.packs} Paquet</Text> : null}
            </Stack>
        </Paper>
    );
};
