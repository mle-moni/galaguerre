import { Button, Modal, Text } from "@mantine/core";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import {
    useCreateDeckMutation,
    useDecksQuery,
    useDeleteDeckMutation,
    useSelectDeckMutation,
} from "~/hooks/use_decks";
import { useUser } from "~/hooks/use_user";

export const DecksPage = observer(() => {
    const user = useUser();
    const navigate = useNavigate();
    const decksQuery = useDecksQuery();
    const createMutation = useCreateDeckMutation();
    const deleteMutation = useDeleteDeckMutation();
    const selectMutation = useSelectDeckMutation();
    const [deckToDelete, setDeckToDelete] = useState<number | null>(null);

    if (!user) return <Navigate to="/login" />;

    if (decksQuery.isLoading) return <CenteredLoader absolute />;

    const decks = decksQuery.data ?? [];

    const handleCreate = async () => {
        const deck = await createMutation.mutateAsync();
        navigate(`/decks/${deck.id}`);
    };

    const handleDelete = async () => {
        if (deckToDelete === null) return;
        await deleteMutation.mutateAsync(deckToDelete);
        setDeckToDelete(null);
    };

    return (
        <AppLayout title="Mes decks" backTo="/" backLabel="Accueil">
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
                    <h1 className="text-2xl font-bold text-gg-navy m-0">Mes decks</h1>
                    <Button
                        className="gg-btn-primary w-full sm:w-auto"
                        leftSection={<IconPlus size={16} />}
                        loading={createMutation.isPending}
                        onClick={handleCreate}
                    >
                        Nouveau deck
                    </Button>
                </div>

                {decks.length === 0 ? (
                    <div className="gg-panel p-8 text-center">
                        <p className="text-white/80 m-0 mb-4">
                            Vous n'avez pas encore de deck. Créez-en un pour commencer à jouer.
                        </p>
                        <Button className="gg-btn-primary" onClick={handleCreate}>
                            Créer mon premier deck
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {decks.map((deck) => (
                            <div key={deck.id} className="gg-deck-card-item">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-white text-lg">
                                            {deck.name}
                                        </span>
                                        {deck.selected && (
                                            <span className="gg-badge gg-badge--active">Actif</span>
                                        )}
                                        <span
                                            className={`gg-badge ${deck.valid ? "gg-badge--valid" : "gg-badge--invalid"}`}
                                        >
                                            {deck.valid ? "Valide" : "Invalide"}
                                        </span>
                                    </div>
                                    <p className="text-white/60 text-sm m-0 mt-1">
                                        {deck.cardCount} cartes
                                    </p>
                                    {!deck.valid && deck.compositionErrors.length > 0 && (
                                        <p className="text-red-300 text-xs m-0 mt-1">
                                            {deck.compositionErrors[0]}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {!deck.selected && (
                                        <Button
                                            size="xs"
                                            className="gg-btn-primary"
                                            loading={selectMutation.isPending}
                                            disabled={!deck.valid}
                                            onClick={() => selectMutation.mutate(deck.id)}
                                        >
                                            Sélectionner
                                        </Button>
                                    )}
                                    <Button
                                        component={Link}
                                        to={`/decks/${deck.id}`}
                                        size="xs"
                                        variant="outline"
                                        color="gold"
                                        leftSection={<IconEdit size={14} />}
                                    >
                                        Éditer
                                    </Button>
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        color="red"
                                        leftSection={<IconTrash size={14} />}
                                        onClick={() => setDeckToDelete(deck.id)}
                                        disabled={decks.length <= 1}
                                    >
                                        Supprimer
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                opened={deckToDelete !== null}
                onClose={() => setDeckToDelete(null)}
                title="Supprimer ce deck ?"
                centered
            >
                <Text size="sm" mb="lg">
                    Cette action est irréversible.
                </Text>
                <div className="flex justify-end gap-2">
                    <Button variant="default" onClick={() => setDeckToDelete(null)}>
                        Annuler
                    </Button>
                    <Button color="red" loading={deleteMutation.isPending} onClick={handleDelete}>
                        Supprimer
                    </Button>
                </div>
            </Modal>
        </AppLayout>
    );
});
