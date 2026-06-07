import { Button } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLogout } from "~/hooks/use_logout";
import { useUser } from "~/hooks/use_user";

interface AppLayoutProps {
    children: ReactNode;
    title?: string;
    backTo?: string;
    backLabel?: string;
}

export const AppLayout = observer(
    ({ children, title, backTo, backLabel = "Retour" }: AppLayoutProps) => {
        const user = useUser();
        const logoutMutation = useLogout();

        return (
            <div className="gg-page-bg min-h-screen flex flex-col">
                <header className="bg-gg-navy shadow-md px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-gg-gold font-bold text-xl no-underline">
                            Galaguerre
                        </Link>
                        {backTo && (
                            <Link
                                to={backTo}
                                className="text-white/70 text-sm no-underline hover:text-white"
                            >
                                ← {backLabel}
                            </Link>
                        )}
                        {title && (
                            <span className="text-white/90 text-sm font-medium">{title}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {user && (
                            <span className="text-white/80 text-sm hidden sm:inline">
                                {user.pseudo ?? user.email}
                            </span>
                        )}
                        <Button
                            variant="subtle"
                            color="gold"
                            size="xs"
                            leftSection={<IconLogout size={14} />}
                            loading={logoutMutation.isPending}
                            onClick={() => logoutMutation.mutate()}
                        >
                            Déconnexion
                        </Button>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-6">{children}</main>
            </div>
        );
    },
);
