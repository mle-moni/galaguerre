import { CARD_RARITY_LABELS } from "#api_types/card_rarity.types";
import type { ApiCatalogCard } from "#api_types/deck.types";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";
import { CUELUME_BUTTON, CUELUME_TOGGLE } from "~/cuelume/sound_props";

interface BuyCardModalProps {
    card: ApiCatalogCard | null;
    price: number | null;
    userGoldCoins: number;
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    isBuying: boolean;
}

export const BuyCardModal = ({
    card,
    price,
    userGoldCoins,
    opened,
    onClose,
    onConfirm,
    isBuying,
}: BuyCardModalProps) => {
    const canAfford = price !== null && userGoldCoins >= price;

    return (
        <Modal opened={opened} onClose={onClose} title="Acheter une carte" centered>
            {card && price !== null && (
                <Stack gap="md">
                    <Text size="sm">
                        <strong>{card.label}</strong> ({CARD_RARITY_LABELS[card.rarity]})
                    </Text>
                    <Group justify="space-between" align="center">
                        <Text size="sm" fw={600}>
                            Prix
                        </Text>
                        <GoldCoinAmount amount={price} showLabel iconSize={20} />
                    </Group>
                    <Group justify="space-between" align="center">
                        <Text size="sm" c="dimmed">
                            Votre solde
                        </Text>
                        <GoldCoinAmount amount={userGoldCoins} showLabel={false} iconSize={16} />
                    </Group>
                    {!canAfford && (
                        <Text size="sm" c="red">
                            Story points insuffisants
                        </Text>
                    )}
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={onClose} {...CUELUME_TOGGLE}>
                            Annuler
                        </Button>
                        <Button
                            className="gg-btn-primary"
                            onClick={onConfirm}
                            loading={isBuying}
                            disabled={!canAfford}
                            {...CUELUME_BUTTON}
                        >
                            Acheter
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
};
