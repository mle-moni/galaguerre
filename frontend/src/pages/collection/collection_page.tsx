import { observer } from "mobx-react-lite";
import { Navigate } from "react-router-dom";
import { Catalogue } from "~/components/catalogue/catalogue";
import { AppLayout } from "~/components/layout/app_layout";
import { useUser } from "~/hooks/use_user";

export const CollectionPage = observer(() => {
    const user = useUser();

    if (!user) return <Navigate to="/login" />;

    return (
        <AppLayout title="Collection" backTo="/" backLabel="Accueil" fillViewport>
            <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-hidden">
                <h1 className="text-2xl font-bold text-gg-navy m-0 mb-6 shrink-0">Collection</h1>
                <Catalogue headerTitle={false} includeNonCollectible className="flex-1 min-h-0" />
            </div>
        </AppLayout>
    );
});
