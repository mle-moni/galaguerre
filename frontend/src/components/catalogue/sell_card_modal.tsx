import { CARD_RARITY_LABELS } from "#api_types/card_rarity.types";
import { COLLECTION_MIN_CARDS } from "#api_types/collection.types";
import type { ApiCatalogCard } from "#api_types/deck.types";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";

interface SellCardModalProps {
    card: ApiCatalogCard | null;
    price: number | null;
    userGoldCoins: number;
    opened: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    isSelling: boolean;
}

export const SellCardModal = ({
    card,
    price,
    userGoldCoins,
    opened,
    onClose,
    onConfirm,
    isSelling,
}: SellCardModalProps) => {
    const balanceAfterSell = price !== null ? userGoldCoins + price : userGoldCoins;

    return (
        <Modal opened={opened} onClose={onClose} title="Vendre une carte" centered>
            {card && price !== null && (
                <Stack gap="md">
                    <Text size="sm">
                        <strong>{card.label}</strong> ({CARD_RARITY_LABELS[card.rarity]})
                    </Text>
                    <Text size="sm" c="dimmed">
                        Vous devez conserver au moins {COLLECTION_MIN_CARDS} cartes dans votre
                        collection pour pouvoir constituer un deck.
                    </Text>
                    <Group justify="space-between" align="center">
                        <Text size="sm" fw={600}>
                            Prix de revente
                        </Text>
                        <GoldCoinAmount amount={price} showLabel iconSize={20} />
                    </Group>
                    <Group justify="space-between" align="center">
                        <Text size="sm" c="dimmed">
                            Solde après vente
                        </Text>
                        <GoldCoinAmount amount={balanceAfterSell} showLabel={false} iconSize={16} />
                    </Group>
                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={onClose}>
                            Annuler
                        </Button>
                        <Button className="gg-btn-primary" onClick={onConfirm} loading={isSelling}>
                            Vendre
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
};
