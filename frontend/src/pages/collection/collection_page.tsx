import { Button, Group } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Catalogue } from "~/components/catalogue/catalogue";
import { GoldCoinAmount } from "~/components/rewards/gold_coin_icon";
import { AppLayout } from "~/components/layout/app_layout";
import { CenteredLoader } from "~/components/centered_loader";
import { entriesToOwnedCounts, useCollectionQuery, usePacksQuery } from "~/hooks/use_collection";
import { useUser } from "~/hooks/use_user";

export const CollectionPage = observer(() => {
    const user = useUser();
    const collectionQuery = useCollectionQuery();
    const packsQuery = usePacksQuery();
    const [showOwnedOnly, setShowOwnedOnly] = useState(true);

    const ownedCounts = useMemo(
        () => entriesToOwnedCounts(collectionQuery.data ?? []),
        [collectionQuery.data],
    );

    if (!user) return <Navigate to="/login" />;
    if (collectionQuery.isLoading || packsQuery.isLoading) {
        return <CenteredLoader absolute />;
    }

    const unopenedCount = packsQuery.data?.unopenedCount ?? 0;

    return (
        <AppLayout title="Collection" backTo="/" backLabel="Accueil" fillViewport>
            <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 shrink-0">
                    <h1 className="text-2xl font-bold text-gg-navy m-0">Collection</h1>
                    <Group gap="sm" className="w-full sm:w-auto">
                        <GoldCoinAmount amount={user.goldCoins} showLabel={false} iconSize={22} />
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
                    className="flex-1 min-h-0"
                />
            </div>
        </AppLayout>
    );
});
