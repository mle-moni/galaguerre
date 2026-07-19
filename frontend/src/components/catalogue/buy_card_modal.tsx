import { CARD_RARITY_LABELS } from "#api_types/card_rarity.types";
import type { ApiCatalogCard } from "#api_types/deck.types";
import { Button, Group, Modal, SegmentedControl, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";
import { CUELUME_BUTTON, CUELUME_TOGGLE } from "~/cuelume/sound_props";

export type BuyCardVariant = "normal" | "golden";

interface BuyCardModalProps {
    card: ApiCatalogCard | null;
    canBuyNormal: boolean;
    canBuyGolden: boolean;
    isGoldenUpgrade: boolean;
    normalPrice: number | null;
    goldenPrice: number | null;
    userGoldCoins: number;
    opened: boolean;
    onClose: () => void;
    onConfirm: (variant: BuyCardVariant) => void | Promise<void>;
    isBuying: boolean;
}

export const BuyCardModal = ({
    card,
    canBuyNormal,
    canBuyGolden,
    isGoldenUpgrade,
    normalPrice,
    goldenPrice,
    userGoldCoins,
    opened,
    onClose,
    onConfirm,
    isBuying,
}: BuyCardModalProps) => {
    const [variant, setVariant] = useState<BuyCardVariant>("normal");

    useEffect(() => {
        if (!opened) return;
        if (canBuyNormal) {
            setVariant("normal");
        } else if (canBuyGolden) {
            setVariant("golden");
        }
    }, [opened, canBuyNormal, canBuyGolden, card?.id]);

    const showVariantPicker = Boolean(card?.goldenVideoUrl) && (canBuyNormal || canBuyGolden);
    const price = variant === "golden" ? goldenPrice : normalPrice;
    const canAfford = price !== null && userGoldCoins >= price;
    const confirmDisabled =
        !canAfford || (variant === "normal" ? !canBuyNormal : !canBuyGolden) || price === null;

    const confirmLabel =
        variant === "golden"
            ? isGoldenUpgrade
                ? "Améliorer en golden"
                : "Acheter golden"
            : "Acheter";

    return (
        <Modal opened={opened} onClose={onClose} title="Acheter une carte" centered>
            {card && (
                <Stack gap="md">
                    <Text size="sm">
                        <strong>{card.label}</strong> ({CARD_RARITY_LABELS[card.rarity]})
                    </Text>
                    {showVariantPicker && (
                        <SegmentedControl
                            fullWidth
                            value={variant}
                            onChange={(value) => setVariant(value as BuyCardVariant)}
                            data={[
                                {
                                    value: "normal",
                                    label: "Normale",
                                    disabled: !canBuyNormal,
                                },
                                {
                                    value: "golden",
                                    label: isGoldenUpgrade ? "Dorée (upgrade)" : "Dorée",
                                    disabled: !canBuyGolden,
                                },
                            ]}
                        />
                    )}
                    <Group justify="space-between" align="center">
                        <Text size="sm" fw={600}>
                            Prix
                        </Text>
                        {price !== null ? (
                            <GoldCoinAmount amount={price} showLabel iconSize={20} />
                        ) : (
                            <Text size="sm" c="dimmed">
                                —
                            </Text>
                        )}
                    </Group>
                    <Group justify="space-between" align="center">
                        <Text size="sm" c="dimmed">
                            Votre solde
                        </Text>
                        <GoldCoinAmount amount={userGoldCoins} showLabel={false} iconSize={16} />
                    </Group>
                    {!canAfford && price !== null && (
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
                            onClick={() => onConfirm(variant)}
                            loading={isBuying}
                            disabled={confirmDisabled}
                            {...CUELUME_BUTTON}
                        >
                            {confirmLabel}
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
};
