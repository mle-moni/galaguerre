import type { ApiCatalogCard } from "#api_types/deck.types";
import { Button } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PackIcon } from "~/components/rewards/pack_icon";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useOpenPackMutation, usePacksQuery } from "~/hooks/use_collection";
import { usePackOpeningFullSize } from "~/hooks/use_pack_opening_full_size";
import { useUser } from "~/hooks/use_user";
import { notifyError } from "~/services/toasts";
import { PackOpeningCard } from "./pack_opening_card";
import "./pack_opening_page.css";

type PackOpeningPhase = "idle" | "packReady" | "opening" | "cards" | "done";

const INTERACTIVE_PACK_WIDTH = 220;

export const PackOpeningPage = observer(() => {
    const user = useUser();
    const packsQuery = usePacksQuery();
    const openPackMutation = useOpenPackMutation();
    const useFullSize = usePackOpeningFullSize();
    const [phase, setPhase] = useState<PackOpeningPhase>("idle");
    const [revealedCards, setRevealedCards] = useState<ApiCatalogCard[] | null>(null);
    const [flippedIndices, setFlippedIndices] = useState<Set<number>>(() => new Set());
    const openingProgressRef = useRef({
        apiDone: false,
        animationDone: false,
        cards: null as ApiCatalogCard[] | null,
    });

    const flippedCount = flippedIndices.size;
    const allCardsFlipped = revealedCards !== null && flippedCount >= revealedCards.length;

    useEffect(() => {
        if (phase === "cards" && allCardsFlipped) {
            setPhase("done");
        }
    }, [phase, allCardsFlipped]);

    if (!user) return <Navigate to="/login" />;
    if (packsQuery.isLoading) return <CenteredLoader absolute />;

    const unopenedCount = packsQuery.data?.unopenedCount ?? 0;
    const packIconWidth =
        unopenedCount <= 1 ? 140 : unopenedCount <= 4 ? 110 : unopenedCount <= 9 ? 90 : 72;

    const tryCompleteOpening = () => {
        const { apiDone, animationDone, cards } = openingProgressRef.current;
        if (!apiDone || !animationDone || cards === null) return;

        setFlippedIndices(new Set());
        setRevealedCards(cards);
        setPhase("cards");
        openingProgressRef.current = { apiDone: false, animationDone: false, cards: null };
    };

    const resetOpeningProgress = () => {
        openingProgressRef.current = { apiDone: false, animationDone: false, cards: null };
    };

    const handleStartOpening = () => {
        setPhase("packReady");
    };

    const handlePackClick = async () => {
        if (phase !== "packReady") return;

        resetOpeningProgress();
        setPhase("opening");

        try {
            const cards = await openPackMutation.mutateAsync();
            openingProgressRef.current.apiDone = true;
            openingProgressRef.current.cards = cards;
            tryCompleteOpening();
        } catch {
            resetOpeningProgress();
            setPhase("packReady");
            notifyError("Impossible d'ouvrir le paquet");
        }
    };

    const handlePackAnimationEnd = () => {
        openingProgressRef.current.animationDone = true;
        tryCompleteOpening();
    };

    const handleOpenAnother = () => {
        setFlippedIndices(new Set());
        setRevealedCards(null);
        resetOpeningProgress();
        setPhase("packReady");
    };

    const handleFlipCard = (index: number) => {
        setFlippedIndices((indices) => new Set([...indices, index]));
    };

    const showCards = phase === "cards" || phase === "done";

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
                    {phase === "idle" ? (
                        <div className="pack-opening__idle">
                            {unopenedCount > 0 ? (
                                <div className="pack-opening__packs">
                                    {Array.from({ length: unopenedCount }, (_, index) => (
                                        <PackIcon key={index} width={packIconWidth} />
                                    ))}
                                </div>
                            ) : null}
                            <p className="pack-opening__message m-0">
                                {unopenedCount > 0
                                    ? `Vous avez ${unopenedCount} paquet${unopenedCount > 1 ? "s" : ""} à ouvrir. Chaque paquet contient 5 cartes.`
                                    : "Vous n'avez plus de paquets à ouvrir."}
                            </p>
                            {unopenedCount > 0 ? (
                                <Button className="gg-btn-primary" onClick={handleStartOpening}>
                                    Ouvrir un paquet
                                </Button>
                            ) : (
                                <Button
                                    component={Link}
                                    to="/collection/shop"
                                    className="gg-btn-primary"
                                >
                                    Acheter un paquet
                                </Button>
                            )}
                        </div>
                    ) : null}

                    {phase === "packReady" || phase === "opening" ? (
                        <div className="pack-opening__pack-ready">
                            <button
                                type="button"
                                className={clsx(
                                    "pack-opening__pack",
                                    phase === "packReady" && "pack-opening__pack--ready",
                                    phase === "opening" && "pack-opening__pack--opening",
                                )}
                                onClick={handlePackClick}
                                onAnimationEnd={handlePackAnimationEnd}
                                disabled={phase === "opening"}
                                aria-busy={phase === "opening"}
                                aria-label="Ouvrir le paquet"
                            >
                                <PackIcon width={INTERACTIVE_PACK_WIDTH} />
                            </button>
                            <p className="pack-opening__message m-0">
                                {phase === "opening"
                                    ? "Ouverture en cours…"
                                    : "Cliquez sur le paquet pour l'ouvrir"}
                            </p>
                        </div>
                    ) : null}

                    {showCards && revealedCards !== null ? (
                        <div className="pack-opening__reveal">
                            <p className="pack-opening__message m-0">
                                {phase === "done"
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
                                        canFlip={phase === "cards" && !flippedIndices.has(index)}
                                        onFlip={() => handleFlipCard(index)}
                                        animationDelay={`${index * 120}ms`}
                                    />
                                ))}
                            </div>
                            {phase === "done" ? (
                                <div className="pack-opening__actions">
                                    {unopenedCount > 0 ? (
                                        <>
                                            <Button
                                                className="gg-btn-primary"
                                                onClick={handleOpenAnother}
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
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
});
