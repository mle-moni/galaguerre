import {
    CARD_RARITY_LABELS,
    type CardRarity,
    getGoldCoinsPerDuplicateSell,
    getMaxCopiesForRarity,
} from "#api_types/card_rarity.types";
import { COLLECTION_MIN_CARDS } from "#api_types/collection.types";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Catalogue } from "~/components/catalogue/catalogue";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { CenteredLoader } from "~/components/centered_loader";
import {
    entriesToOwnedCounts,
    useBuyCardMutation,
    useCollectionQuery,
    useDuplicatesPreviewQuery,
    usePacksQuery,
    useSellCardMutation,
    useSellDuplicatesMutation,
} from "~/hooks/use_collection";
import { useCardsQuery } from "~/hooks/use_cards";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";

const SELL_MODAL_RARITIES: CardRarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export const CollectionPage = observer(() => {
    const user = useUser()!;
    const collectionQuery = useCollectionQuery();
    const packsQuery = usePacksQuery();
    const cardsQuery = useCardsQuery({ includeNonCollectible: true });
    const sellDuplicatesMutation = useSellDuplicatesMutation();
    const buyCardMutation = useBuyCardMutation();
    const sellCardMutation = useSellCardMutation();
    const [showOwnedOnly, setShowOwnedOnly] = useState(true);
    const [sellModalOpened, setSellModalOpened] = useState(false);
    const [buyingCardId, setBuyingCardId] = useState<number | null>(null);
    const [sellingCardId, setSellingCardId] = useState<number | null>(null);

    const duplicatesPreviewQuery = useDuplicatesPreviewQuery(sellModalOpened);

    const ownedCounts = useMemo(
        () => entriesToOwnedCounts(collectionQuery.data ?? []),
        [collectionQuery.data],
    );

    const catalogById = useMemo(
        () => new Map((cardsQuery.data ?? []).map((card) => [card.id, card])),
        [cardsQuery.data],
    );

    const totalCollection = useMemo(
        () => [...ownedCounts.values()].reduce((sum, count) => sum + count, 0),
        [ownedCounts],
    );

    const canBuyCard = useCallback(
        (cardId: number) => {
            if (!user) return false;

            const card = catalogById.get(cardId);
            if (!card || !card.isCollectible) return false;

            const owned = ownedCounts.get(cardId) ?? 0;
            const maxCopies = getMaxCopiesForRarity(card.rarity);
            if (owned >= maxCopies) return false;

            return true;
        },
        [user, catalogById, ownedCounts],
    );

    const canSellCard = useCallback(
        (cardId: number) => {
            if (!user) return false;

            const owned = ownedCounts.get(cardId) ?? 0;
            if (owned <= 0) return false;
            if (totalCollection <= COLLECTION_MIN_CARDS) return false;

            return true;
        },
        [user, ownedCounts, totalCollection],
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

    const handleSellCard = async (cardId: number) => {
        setSellingCardId(cardId);
        try {
            await sellCardMutation.mutateAsync(cardId);
            notifySuccess("Carte vendue !");
        } catch {
            notifyError("Impossible de vendre cette carte");
        } finally {
            setSellingCardId(null);
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

    if (collectionQuery.isLoading || packsQuery.isLoading || cardsQuery.isLoading) {
        return <CenteredLoader absolute />;
    }

    const unopenedCount = packsQuery.data?.unopenedCount ?? 0;
    const duplicatesPreview = duplicatesPreviewQuery.data;
    const hasDuplicates = (duplicatesPreview?.totalGoldCoins ?? 0) > 0;

    return (
        <>
            <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 shrink-0">
                    <h1 className="text-2xl font-bold text-white m-0">Collection</h1>
                    <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:gap-3 sm:w-auto">
                        <GoldCoinAmount amount={user.goldCoins} showLabel={false} iconSize={22} />
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
                            <Button
                                variant="default"
                                className="col-span-1 sm:flex-none"
                                onClick={() => setSellModalOpened(true)}
                            >
                                <span className="max-[369px]:hidden">Vendre les doublons</span>
                                <span className="hidden max-[369px]:inline">💰 Doublons</span>
                            </Button>
                            <Button
                                component={Link}
                                to="/collection/shop"
                                variant="default"
                                className="col-span-1 sm:flex-none"
                            >
                                Boutique
                            </Button>
                            <Button
                                component={Link}
                                to="/collection/packs"
                                className="gg-btn-primary col-span-2 sm:col-span-1 sm:flex-none"
                                disabled={unopenedCount === 0}
                                leftSection={<PackIcon width={18} />}
                            >
                                Ouvrir des paquets ({unopenedCount})
                            </Button>
                        </div>
                    </div>
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
                    canSellCard={canSellCard}
                    onSellCard={handleSellCard}
                    sellingCardId={sellingCardId}
                    userGoldCoins={user.goldCoins}
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
                        <strong>2 exemplaires</strong> pour une carte commune rare ou épique,{" "}
                        <strong>1 exemplaire</strong> pour une carte légendaire.
                    </Text>
                    <Text size="sm">La vente est irréversible. Chaque doublon rapporte :</Text>
                    <Stack gap={4}>
                        {SELL_MODAL_RARITIES.map((rarity) => (
                            <Group key={rarity} justify="space-between" wrap="nowrap">
                                <Text size="sm">{CARD_RARITY_LABELS[rarity]}</Text>
                                <GoldCoinAmount
                                    amount={getGoldCoinsPerDuplicateSell(rarity)}
                                    iconSize={16}
                                />
                            </Group>
                        ))}
                    </Stack>

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
        </>
    );
});
