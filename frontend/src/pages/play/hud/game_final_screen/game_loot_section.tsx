import type { GameRewardPlayerResult } from "#api_types/rewards.types";
import { Paper, Stack, Text } from "@mantine/core";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";
import { PackAmount } from "~/components/rewards/pack_icon";

interface GameLootSectionProps {
    reward: GameRewardPlayerResult;
    xp?: number;
}

export const GameLootSection = ({ reward, xp = 0 }: GameLootSectionProps) => {
    if (reward.goldCoins === 0 && reward.packs === 0 && xp === 0) {
        return null;
    }

    return (
        <Paper withBorder p="md" radius="md">
            <Stack gap="xs">
                <Text fw={600}>Butin</Text>
                {reward.goldCoins > 0 ? (
                    <GoldCoinAmount amount={reward.goldCoins} prefix="+" iconSize={20} />
                ) : null}
                {reward.packs > 0 ? (
                    <PackAmount amount={reward.packs} prefix="+" iconWidth={20} />
                ) : null}
                {xp > 0 ? (
                    <Text size="sm" c="gold.3" fw={600}>
                        +{xp} XP
                    </Text>
                ) : null}
            </Stack>
        </Paper>
    );
};
