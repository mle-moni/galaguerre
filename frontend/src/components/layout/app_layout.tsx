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
    fillViewport?: boolean;
}

export const AppLayout = observer(
    ({ children, title, backTo, backLabel = "Retour", fillViewport = false }: AppLayoutProps) => {
        const user = useUser();
        const logoutMutation = useLogout();

        return (
            <div className="gg-page-bg flex flex-col overflow-hidden">
                <header className="shrink-0 bg-gg-navy shadow-md px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <Link
                            to="/"
                            className="text-gg-gold font-bold text-lg sm:text-xl no-underline shrink-0"
                        >
                            Galaguerre
                        </Link>
                        {backTo && (
                            <Link
                                to={backTo}
                                className="text-white/70 text-sm no-underline hover:text-white shrink-0"
                            >
                                ← {backLabel}
                            </Link>
                        )}
                        {title && (
                            <span
                                className={`text-white/90 text-sm font-medium truncate max-w-[40vw] sm:max-w-none ${backTo ? "hidden sm:inline" : ""}`}
                            >
                                {title}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {user && (
                            <>
                                <span className="text-white/80 text-sm hidden md:inline">
                                    {user.pseudo ?? user.email}
                                </span>
                                <Button
                                    variant="subtle"
                                    color="gold"
                                    size="xs"
                                    loading={logoutMutation.isPending}
                                    onClick={() => logoutMutation.mutate()}
                                    aria-label="Déconnexion"
                                >
                                    <span className="inline-flex items-center gap-1">
                                        <IconLogout size={14} />
                                        <span className="hidden sm:inline">Déconnexion</span>
                                    </span>
                                </Button>
                            </>
                        )}
                    </div>
                </header>
                <main
                    className={`flex-1 min-h-0 min-w-0 flex flex-col p-3 sm:p-4 md:p-6 ${fillViewport ? "overflow-hidden" : "overflow-x-clip overflow-y-auto"}`}
                >
                    {children}
                </main>
            </div>
        );
    },
);
