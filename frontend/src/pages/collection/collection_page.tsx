import { getGoldCoinsPerCardBuy, getMaxCopiesForRarity } from "#api_types/card_rarity.types";
import { CARD_RARITY_LABELS } from "#api_types/card_rarity.types";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Catalogue } from "~/components/catalogue/catalogue";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import {
    entriesToOwnedCounts,
    useBuyCardMutation,
    useCollectionQuery,
    useDuplicatesPreviewQuery,
    usePacksQuery,
    useSellDuplicatesMutation,
} from "~/hooks/use_collection";
import { useCardsQuery } from "~/hooks/use_cards";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";

export const CollectionPage = observer(() => {
    const user = useUser();
    const collectionQuery = useCollectionQuery();
    const packsQuery = usePacksQuery();
    const cardsQuery = useCardsQuery({ includeNonCollectible: true });
    const sellDuplicatesMutation = useSellDuplicatesMutation();
    const buyCardMutation = useBuyCardMutation();
    const [showOwnedOnly, setShowOwnedOnly] = useState(true);
    const [sellModalOpened, setSellModalOpened] = useState(false);
    const [buyingCardId, setBuyingCardId] = useState<number | null>(null);

    const duplicatesPreviewQuery = useDuplicatesPreviewQuery(sellModalOpened);

    const ownedCounts = useMemo(
        () => entriesToOwnedCounts(collectionQuery.data ?? []),
        [collectionQuery.data],
    );

    const catalogById = useMemo(
        () => new Map((cardsQuery.data ?? []).map((card) => [card.id, card])),
        [cardsQuery.data],
    );

    const canBuyCard = useCallback(
        (cardId: number) => {
            if (!user || showOwnedOnly) return false;

            const card = catalogById.get(cardId);
            if (!card || !card.isCollectible) return false;

            const owned = ownedCounts.get(cardId) ?? 0;
            const maxCopies = getMaxCopiesForRarity(card.rarity);
            if (owned >= maxCopies) return false;

            return user.goldCoins >= getGoldCoinsPerCardBuy(card.rarity);
        },
        [user, showOwnedOnly, catalogById, ownedCounts],
    );

    const handleBuyCard = async (cardId: number) => {
        setBuyingCardId(cardId);
        try {
            await buyCardMutation.mutateAsync(cardId);
            notifySuccess("Carte achetée !");
        } catch {
            notifyError("Impossible d'acheter cette carte");
        } finally {
            setBuyingCardId(null);
        }
    };

    const handleSellDuplicates = async () => {
        const earned = duplicatesPreview?.totalGoldCoins ?? 0;
        try {
            await sellDuplicatesMutation.mutateAsync();
            notifySuccess(`Doublons vendus : +${earned} story points`);
            setSellModalOpened(false);
        } catch {
            notifyError("Impossible de vendre les doublons");
        }
    };

    if (!user) return <Navigate to="/login" />;
    if (collectionQuery.isLoading || packsQuery.isLoading || cardsQuery.isLoading) {
        return <CenteredLoader absolute />;
    }

    const unopenedCount = packsQuery.data?.unopenedCount ?? 0;
    const duplicatesPreview = duplicatesPreviewQuery.data;
    const hasDuplicates = (duplicatesPreview?.totalGoldCoins ?? 0) > 0;

    return (
        <AppLayout title="Collection" backTo="/" backLabel="Accueil" fillViewport>
            <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 shrink-0">
                    <h1 className="text-2xl font-bold text-gg-navy m-0">Collection</h1>
                    <Group gap="sm" className="w-full sm:w-auto">
                        <GoldCoinAmount amount={user.goldCoins} showLabel={false} iconSize={22} />
                        <Button
                            variant="default"
                            className="flex-1 sm:flex-none"
                            onClick={() => setSellModalOpened(true)}
                        >
                            Vendre les doublons
                        </Button>
                        <Button
                            component={Link}
                            to="/collection/shop"
                            variant="default"
                            className="flex-1 sm:flex-none"
                        >
                            Boutique
                        </Button>
                        <Button
                            component={Link}
                            to="/collection/packs"
                            className="gg-btn-primary flex-1 sm:flex-none"
                            disabled={unopenedCount === 0}
                            leftSection={<PackIcon width={18} />}
                        >
                            Ouvrir des paquets ({unopenedCount})
                        </Button>
                    </Group>
                </div>
                <Catalogue
                    headerTitle={false}
                    includeNonCollectible
                    ownedCounts={ownedCounts}
                    showOwnedOnly={showOwnedOnly}
                    onShowOwnedOnlyChange={setShowOwnedOnly}
                    canBuyCard={canBuyCard}
                    onBuyCard={handleBuyCard}
                    buyingCardId={buyingCardId}
                    className="flex-1 min-h-0"
                />
            </div>

            <Modal
                opened={sellModalOpened}
                onClose={() => setSellModalOpened(false)}
                title="Vendre les doublons"
                centered
            >
                <Stack gap="md">
                    <Text size="sm">
                        Un doublon est un exemplaire au-delà du maximum utilisable en deck :{" "}
                        <strong>2 exemplaires</strong> pour une carte commune,{" "}
                        <strong>1 exemplaire</strong> pour une carte légendaire.
                    </Text>
                    <Text size="sm">
                        La vente est irréversible. Chaque doublon rapporte{" "}
                        <strong>25 story points</strong> (commune) ou{" "}
                        <strong>250 story points</strong> (légendaire).
                    </Text>

                    {duplicatesPreviewQuery.isLoading ? (
                        <CenteredLoader />
                    ) : duplicatesPreview && duplicatesPreview.lines.length > 0 ? (
                        <Stack gap="xs">
                            <Text size="sm" fw={600}>
                                Détail des doublons à vendre
                            </Text>
                            {duplicatesPreview.lines.map((line) => (
                                <Group key={line.cardId} justify="space-between" wrap="nowrap">
                                    <Text size="sm">
                                        {line.cardLabel} ({CARD_RARITY_LABELS[line.rarity]}) ×
                                        {line.excessCount}
                                    </Text>
                                    <GoldCoinAmount
                                        amount={line.goldCoinsTotal}
                                        showLabel={false}
                                        iconSize={16}
                                    />
                                </Group>
                            ))}
                        </Stack>
                    ) : (
                        <Text size="sm" c="dimmed">
                            Vous n&apos;avez aucun doublon à vendre pour le moment.
                        </Text>
                    )}

                    <Group justify="space-between" align="center">
                        <Text size="sm" fw={600}>
                            Total à recevoir
                        </Text>
                        <GoldCoinAmount
                            amount={duplicatesPreview?.totalGoldCoins ?? 0}
                            showLabel={false}
                            iconSize={20}
                        />
                    </Group>

                    <Group justify="flex-end" gap="sm">
                        <Button variant="default" onClick={() => setSellModalOpened(false)}>
                            Annuler
                        </Button>
                        <Button
                            className="gg-btn-primary"
                            onClick={handleSellDuplicates}
                            loading={sellDuplicatesMutation.isPending}
                            disabled={!hasDuplicates}
                        >
                            Confirmer la vente
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </AppLayout>
    );
});
