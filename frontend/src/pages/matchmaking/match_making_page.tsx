import { Button, Text } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ManaCurveChart } from "~/components/decks/mana_curve_chart";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { useCardsQuery } from "~/hooks/use_cards";
import { useDecksQuery } from "~/hooks/use_decks";
import { useUser } from "~/hooks/use_user";
import { privateAxios } from "~/services/axios";

export const MatchmakingPage = observer(() => {
    const user = useUser();
    const [searchingMatch, setSearchingMatch] = useState(false);
    const decksQuery = useDecksQuery();
    const cardsQuery = useCardsQuery();

    const searchMutation = useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post("/api/games");
            return response.data;
        },
        onSuccess: () => {
            setSearchingMatch(true);
        },
    });

    if (!user) return <Navigate to="/login" />;
    if (user.currentGameId) return <Navigate to="/play" />;

    if (decksQuery.isLoading || cardsQuery.isLoading) return <CenteredLoader absolute />;

    const selectedDeck = decksQuery.data?.find((d) => d.selected);
    const catalogById = new Map((cardsQuery.data ?? []).map((c) => [c.id, c]));

    const deckComposition = new Map(
        (selectedDeck?.cards ?? []).map(({ cardId, count }) => [cardId, count] as const),
    );

    const canSearch = selectedDeck?.valid ?? false;

    return (
        <AppLayout title="Matchmaking" backTo="/" backLabel="Accueil">
            <div className="max-w-lg mx-auto">
                <div className="gg-panel">
                    <div className="gg-panel-header">Rechercher une partie</div>
                    <div className="gg-panel-body flex flex-col gap-4">
                        {selectedDeck ? (
                            <>
                                <div>
                                    <Text className="text-white font-semibold mb-1">
                                        Deck sélectionné : {selectedDeck.name}
                                    </Text>
                                    <Text size="sm" className="text-white/60">
                                        {selectedDeck.cardCount}/20 cartes (15 minimum)
                                        {!selectedDeck.valid && " — deck invalide"}
                                    </Text>
                                </div>

                                {selectedDeck.cardCount > 0 && (
                                    <div className="pointer-events-none">
                                        <ManaCurveChart
                                            composition={deckComposition}
                                            catalogById={catalogById}
                                            selectedCost={null}
                                            onCostClick={() => {}}
                                        />
                                    </div>
                                )}

                                <Link
                                    to="/decks"
                                    className="text-gg-gold text-sm font-medium no-underline hover:underline"
                                >
                                    Changer de deck →
                                </Link>
                            </>
                        ) : (
                            <Text className="text-white/80">
                                Vous n'avez pas de deck sélectionné.{" "}
                                <Link to="/decks" className="text-gg-gold">
                                    Choisissez un deck
                                </Link>{" "}
                                pour jouer.
                            </Text>
                        )}

                        {!canSearch && selectedDeck && (
                            <Text size="sm" className="text-red-300">
                                Votre deck doit être valide et contenir entre 15 et 20 cartes.
                            </Text>
                        )}

                        {!searchingMatch ? (
                            <Button
                                className="gg-btn-primary"
                                size="md"
                                disabled={!canSearch}
                                loading={searchMutation.isPending}
                                onClick={() => searchMutation.mutate()}
                            >
                                Rechercher une partie
                            </Button>
                        ) : (
                            <div className="text-center py-4">
                                <CenteredLoader />
                                <Text className="text-white mt-4">Recherche en cours...</Text>
                                <Text size="sm" className="text-white/60 mt-1">
                                    En attente d'un adversaire
                                </Text>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
});
