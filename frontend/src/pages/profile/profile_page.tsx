import { Button, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AvatarPicker } from "~/components/avatar_picker/avatar_picker";
import { UserAvatar } from "~/components/user_avatar";
import { getAvatarImageUrl } from "~/helpers/avatar_image_url";
import { useApiMutation } from "~/hooks/use_api_mutation";
import { useCardsQuery } from "~/hooks/use_cards";
import { USER_QUERY_KEY, useUser } from "~/hooks/use_user";
import { client } from "~/services/client";
import { notifyError, notifySuccess } from "~/services/toasts";

export const ProfilePage = observer(() => {
    const user = useUser();
    const queryClient = useQueryClient();
    const cardsQuery = useCardsQuery({ includeNonCollectible: true });
    const [selectedAvatarCardId, setSelectedAvatarCardId] = useState<number | null>(null);

    const avatarCardId = selectedAvatarCardId ?? user?.avatarCardId ?? null;
    const catalogById = new Map((cardsQuery.data ?? []).map((card) => [card.id, card]));
    const avatarImageUrl = getAvatarImageUrl(avatarCardId ?? undefined, catalogById);

    const updateAvatarMutation = useApiMutation({
        mutationFn: async (nextAvatarCardId: number) => {
            return client.api.auth.updateAvatar({
                body: { avatarCardId: nextAvatarCardId },
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
            notifySuccess("Avatar mis à jour");
        },
        onError: (error) => {
            notifyError(error.message);
        },
    });

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const displayName = user.pseudo ?? user.email.split("@")[0];
    const hasChanges = avatarCardId != null && avatarCardId !== user.avatarCardId;

    return (
        <div className="max-w-lg mx-auto">
            <div className="gg-panel">
                <div className="gg-panel-header">Mon profil</div>
                <div className="gg-panel-body flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <UserAvatar
                            pseudo={user.pseudo}
                            email={user.email}
                            userId={user.id}
                            imageUrl={avatarImageUrl}
                            className="w-16 h-16 text-xl"
                            alt={displayName}
                        />
                        <div>
                            <Text className="text-white font-semibold text-lg m-0">
                                {displayName}
                            </Text>
                            <Text className="text-white/60 m-0" size="sm">
                                {user.progression.levelTitle} · Niveau {user.progression.level}
                            </Text>
                        </div>
                    </div>

                    <div>
                        <Text className="text-white font-semibold mb-2">Choisir un avatar</Text>
                        <Text className="text-white/70 m-0 mb-3" size="sm">
                            Sélectionnez l&apos;illustration d&apos;une carte pour représenter votre
                            héros en partie.
                        </Text>
                        <AvatarPicker value={avatarCardId} onChange={setSelectedAvatarCardId} />
                    </div>

                    <Button
                        className="gg-btn-primary w-full"
                        disabled={!hasChanges}
                        loading={updateAvatarMutation.isPending}
                        onClick={() => {
                            if (avatarCardId == null) {
                                return;
                            }

                            updateAvatarMutation.mutate(avatarCardId);
                        }}
                    >
                        Enregistrer l&apos;avatar
                    </Button>
                </div>
            </div>
        </div>
    );
});
