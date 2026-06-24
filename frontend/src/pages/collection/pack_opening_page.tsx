import type { ApiCatalogCard } from "#api_types/deck.types";
import { Button } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useOpenPackMutation, usePacksQuery } from "~/hooks/use_collection";
import { usePackOpeningFullSize } from "~/hooks/use_pack_opening_full_size";
import { useUser } from "~/hooks/use_user";
import { notifyError } from "~/services/toasts";
import { PackOpeningCard } from "./pack_opening_card";
import "./pack_opening_page.css";

export const PackOpeningPage = observer(() => {
    const user = useUser();
    const packsQuery = usePacksQuery();
    const openPackMutation = useOpenPackMutation();
    const useFullSize = usePackOpeningFullSize();
    const [revealedCards, setRevealedCards] = useState<ApiCatalogCard[] | null>(null);
    const [flippedIndices, setFlippedIndices] = useState<Set<number>>(() => new Set());

    if (!user) return <Navigate to="/login" />;
    if (packsQuery.isLoading) return <CenteredLoader absolute />;

    const unopenedCount = packsQuery.data?.unopenedCount ?? 0;

    const handleOpenPack = async () => {
        try {
            const cards = await openPackMutation.mutateAsync();
            setFlippedIndices(new Set());
            setRevealedCards(cards);
        } catch {
            notifyError("Impossible d'ouvrir le paquet");
        }
    };

    const handleOpenAnother = () => {
        setFlippedIndices(new Set());
        setRevealedCards(null);
    };

    const handleFlipCard = (index: number) => {
        setFlippedIndices((indices) => new Set([...indices, index]));
    };

    const flippedCount = flippedIndices.size;
    const allCardsFlipped = revealedCards !== null && flippedCount >= revealedCards.length;

    return (
        <AppLayout
            title="Ouvrir des paquets"
            backTo="/collection"
            backLabel="Collection"
            fillViewport
        >
            <div
                className={clsx(
                    "mx-auto w-full flex flex-col flex-1 min-h-0 gap-6 pb-4",
                    useFullSize ? "pack-opening__container--full" : "max-w-5xl",
                )}
            >
                <h1 className="text-2xl font-bold text-gg-navy m-0 shrink-0">Ouvrir des paquets</h1>

                <div className="pack-opening__stage">
                    {revealedCards === null ? (
                        <div className="pack-opening__idle">
                            <p className="pack-opening__message m-0">
                                {unopenedCount > 0
                                    ? `Vous avez ${unopenedCount} paquet${unopenedCount > 1 ? "s" : ""} à ouvrir. Chaque paquet contient 5 cartes.`
                                    : "Vous n'avez plus de paquets à ouvrir."}
                            </p>
                            <Button
                                className="gg-btn-primary"
                                loading={openPackMutation.isPending}
                                disabled={unopenedCount === 0}
                                onClick={handleOpenPack}
                            >
                                Ouvrir un paquet
                            </Button>
                        </div>
                    ) : (
                        <div className="pack-opening__reveal">
                            <p className="pack-opening__message m-0">
                                {allCardsFlipped
                                    ? useFullSize
                                        ? "Voici vos 5 nouvelles cartes :"
                                        : "Voici vos 5 nouvelles cartes — cliquez sur une carte pour la voir en grand"
                                    : `Cliquez sur une carte pour la retourner (${flippedCount}/${revealedCards.length})`}
                            </p>
                            <div
                                className={clsx(
                                    "pack-opening__cards",
                                    useFullSize && "pack-opening__cards--full",
                                )}
                            >
                                {revealedCards.map((card, index) => (
                                    <PackOpeningCard
                                        key={`${card.id}-${index}`}
                                        card={card}
                                        isFlipped={flippedIndices.has(index)}
                                        canFlip={!flippedIndices.has(index)}
                                        onFlip={() => handleFlipCard(index)}
                                        animationDelay={`${index * 120}ms`}
                                    />
                                ))}
                            </div>
                            {allCardsFlipped ? (
                                <div className="pack-opening__actions">
                                    {unopenedCount > 0 ? (
                                        <>
                                            <Button
                                                className="gg-btn-primary"
                                                loading={openPackMutation.isPending}
                                                onClick={async () => {
                                                    handleOpenAnother();
                                                    await handleOpenPack();
                                                }}
                                            >
                                                Ouvrir un autre paquet ({unopenedCount})
                                            </Button>
                                            <Button
                                                component={Link}
                                                to="/collection"
                                                variant="outline"
                                                color="navy"
                                            >
                                                Voir ma collection
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            component={Link}
                                            to="/collection"
                                            className="gg-btn-primary"
                                        >
                                            Retour à la collection
                                        </Button>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
});
