import {
    GOLD_COINS_PER_DEFEAT,
    GOLD_COINS_PER_PACK,
    GOLD_COINS_PER_VICTORY,
} from "#api_types/rewards.types";
import { ActionIcon, Button, Center, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { IconQuestionMark } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { GoldCoinAmount, GoldCoinIcon } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { useBuyPackMutation } from "~/hooks/use_collection";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";

export const CollectionShopPage = observer(() => {
    const user = useUser()!;
    const buyPackMutation = useBuyPackMutation();
    const [helpOpened, setHelpOpened] = useState(false);

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
        <div className="max-w-2xl mx-auto w-full">
                <h1 className="text-2xl font-bold text-white mb-6">Boutique</h1>

                <Stack gap="lg">
                    <Group gap="xs" wrap="nowrap" align="center">
                        <GoldCoinIcon size={48} />
                        <Text size="lg" fw={600}>
                            x {goldCoins}
                        </Text>
                    </Group>

                    <Modal
                        opened={helpOpened}
                        onClose={() => setHelpOpened(false)}
                        title="Comment gagner des story points ?"
                        centered
                    >
                        <Stack gap="sm">
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
                            <Group gap={6} wrap="nowrap">
                                <PackIcon width={16} />
                                <Text size="sm" c="dimmed">
                                    Première victoire du jour : +1 paquet bonus
                                </Text>
                            </Group>
                        </Stack>
                    </Modal>

                    <Paper withBorder p="lg" radius="md">
                        <Stack gap="sm">
                            <Center>
                                <PackIcon width={120} />
                            </Center>
                            <Text fw={600}>Paquet de cartes</Text>
                            <Text size="sm" c="dimmed">
                                5 cartes aléatoires pour enrichir votre collection.
                            </Text>
                            <Group gap="xs" wrap="nowrap" align="center">
                                <GoldCoinAmount
                                    amount={GOLD_COINS_PER_PACK}
                                    showLabel
                                    iconSize={20}
                                />
                                <ActionIcon
                                    variant="transparent"
                                    size="sm"
                                    className="text-white/70"
                                    aria-label="Comment gagner des story points"
                                    onClick={() => setHelpOpened(true)}
                                >
                                    <IconQuestionMark size={18} />
                                </ActionIcon>
                            </Group>
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
                </Stack>
            </div>
    );
});
