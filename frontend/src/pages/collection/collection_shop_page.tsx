import {
    GOLD_COINS_PER_DEFEAT,
    GOLD_COINS_PER_PACK,
    GOLD_COINS_PER_VICTORY,
} from "#api_types/rewards.types";
import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { Navigate } from "react-router-dom";
import { GoldCoinAmount, GoldCoinIcon } from "~/components/rewards/gold_coin_icon";
import { AppLayout } from "~/components/layout/app_layout";
import { useBuyPackMutation } from "~/hooks/use_collection";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";

export const CollectionShopPage = observer(() => {
    const user = useUser();
    const buyPackMutation = useBuyPackMutation();

    if (!user) return <Navigate to="/login" />;

    const goldCoins = user.goldCoins;
    const canAfford = goldCoins >= GOLD_COINS_PER_PACK;

    const handleBuy = async () => {
        try {
            await buyPackMutation.mutateAsync();
            notifySuccess("Paquet acheté !");
        } catch {
            notifyError("Impossible d'acheter le paquet");
        }
    };

    return (
        <AppLayout title="Boutique" backTo="/collection" backLabel="Collection">
            <div className="max-w-2xl mx-auto w-full">
                <h1 className="text-2xl font-bold text-gg-navy mb-6">Boutique</h1>

                <Stack gap="lg">
                    <GoldCoinAmount
                        amount={goldCoins}
                        iconSize={32}
                        textProps={{ size: "lg", fw: 600 }}
                    />

                    <Paper withBorder p="lg" radius="md">
                        <Stack gap="sm">
                            <Text fw={600}>Paquet de cartes</Text>
                            <Text size="sm" c="dimmed">
                                5 cartes aléatoires pour enrichir votre collection.
                            </Text>
                            <GoldCoinAmount amount={GOLD_COINS_PER_PACK} showLabel iconSize={20} />
                            <Button
                                onClick={handleBuy}
                                loading={buyPackMutation.isPending}
                                disabled={!canAfford}
                                className="gg-btn-primary w-full sm:w-auto"
                            >
                                Acheter
                            </Button>
                        </Stack>
                    </Paper>

                    <Stack gap="xs">
                        <Text size="sm" fw={600}>
                            Comment gagner des grains ?
                        </Text>
                        <Text size="sm" c="dimmed">
                            Victoire :{" "}
                            <Group component="span" gap={4} wrap="nowrap" display="inline-flex">
                                <GoldCoinIcon size={16} />
                                <span>+{GOLD_COINS_PER_VICTORY}</span>
                            </Group>
                        </Text>
                        <Text size="sm" c="dimmed">
                            Défaite ou match nul :{" "}
                            <Group component="span" gap={4} wrap="nowrap" display="inline-flex">
                                <GoldCoinIcon size={16} />
                                <span>+{GOLD_COINS_PER_DEFEAT}</span>
                            </Group>
                        </Text>
                        <Text size="sm" c="dimmed">
                            Première victoire du jour : +1 paquet bonus
                        </Text>
                    </Stack>
                </Stack>
            </div>
        </AppLayout>
    );
});
