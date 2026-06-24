import type { ApiCatalogCard } from "#api_types/deck.types";
import { Button } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { CatalogCardDisplay } from "~/components/cards/catalog_card_display";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useOpenPackMutation, usePacksQuery } from "~/hooks/use_collection";
import { useUser } from "~/hooks/use_user";
import { notifyError } from "~/services/toasts";
import "./pack_opening_page.css";

export const PackOpeningPage = observer(() => {
    const user = useUser();
    const packsQuery = usePacksQuery();
    const openPackMutation = useOpenPackMutation();
    const [revealedCards, setRevealedCards] = useState<ApiCatalogCard[] | null>(null);

    if (!user) return <Navigate to="/login" />;
    if (packsQuery.isLoading) return <CenteredLoader absolute />;

    const unopenedCount = packsQuery.data?.unopenedCount ?? 0;

    const handleOpenPack = async () => {
        try {
            const cards = await openPackMutation.mutateAsync();
            setRevealedCards(cards);
        } catch {
            notifyError("Impossible d'ouvrir le paquet");
        }
    };

    const handleOpenAnother = () => {
        setRevealedCards(null);
    };

    return (
        <AppLayout
            title="Ouvrir des paquets"
            backTo="/collection"
            backLabel="Collection"
            fillViewport
        >
            <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 min-h-0 gap-6">
                <h1 className="text-2xl font-bold text-gg-navy m-0">Ouvrir des paquets</h1>

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
                        <p className="pack-opening__message m-0">Voici vos 5 nouvelles cartes :</p>
                        <div className="pack-opening__cards">
                            {revealedCards.map((card, index) => (
                                <div
                                    key={`${card.id}-${index}`}
                                    className="pack-opening__card"
                                    style={{ animationDelay: `${index * 120}ms` }}
                                >
                                    <CatalogCardDisplay card={card} />
                                </div>
                            ))}
                        </div>
                        <div className="pack-opening__actions">
                            {unopenedCount > 0 ? (
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
                            ) : (
                                <Button
                                    component={Link}
                                    to="/collection"
                                    className="gg-btn-primary"
                                >
                                    Retour à la collection
                                </Button>
                            )}
                            <Button
                                component={Link}
                                to="/collection"
                                variant="outline"
                                color="navy"
                            >
                                Voir ma collection
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
});
