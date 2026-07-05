import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { Navigate, Outlet, useMatches } from "react-router-dom";
import "~/router.types.js";
import { useUser } from "~/hooks/use_user";
import { AppHeader } from "./app_header.jsx";
import { GuestAppHeader } from "./guest_app_header.jsx";
import "./app_layout.css";

interface AppLayoutShellProps {
    children: ReactNode;
    fillViewport?: boolean;
    isPublicRoute?: boolean;
}

const AppLayoutShell = observer(
    ({ children, fillViewport = false, isPublicRoute = false }: AppLayoutShellProps) => {
        const user = useUser();

        if (!user && !isPublicRoute) return <Navigate to="/login" replace />;

        const playTarget = user?.currentGameId ? "/play" : "/matchmaking";

        return (
            <div className="app-layout">
                {user ? <AppHeader user={user} playTarget={playTarget} /> : <GuestAppHeader />}
                <div className="app-layout__main">
                    <div
                        className={clsx(
                            "app-layout__content",
                            fillViewport && "app-layout__content--fill",
                        )}
                    >
                        {children}
                    </div>
                </div>
            </div>
        );
    },
);

export const AppLayout = observer(() => {
    const matches = useMatches();
    const fillViewport = matches.some((match) => match.handle?.fillViewport);
    const isPublicRoute = matches.some((match) => match.handle?.public);

    return (
        <AppLayoutShell fillViewport={fillViewport} isPublicRoute={isPublicRoute}>
            <Outlet />
        </AppLayoutShell>
    );
});

export const AppLayoutFrame = observer(
    ({ children, fillViewport = false }: AppLayoutShellProps) => {
        return <AppLayoutShell fillViewport={fillViewport}>{children}</AppLayoutShell>;
    },
);
