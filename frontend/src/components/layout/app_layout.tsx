import clsx from "clsx";
import { observer } from "mobx-react-lite";
import type { ReactNode } from "react";
import { Navigate, Outlet, useMatches } from "react-router-dom";
import "~/router.types.js";
import { useUser } from "~/hooks/use_user";
import { AppHeader } from "./app_header.jsx";
import "./app_layout.css";

interface AppLayoutShellProps {
    children: ReactNode;
    fillViewport?: boolean;
}

const AppLayoutShell = observer(({ children, fillViewport = false }: AppLayoutShellProps) => {
    const user = useUser();

    if (!user) return <Navigate to="/login" replace />;

    const playTarget = user.currentGameId ? "/play" : "/matchmaking";

    return (
        <div className="app-layout">
            <AppHeader user={user} playTarget={playTarget} />
            <div className="app-layout__main">
                <div className={clsx("app-layout__content", fillViewport && "app-layout__content--fill")}>
                    {children}
                </div>
            </div>
        </div>
    );
});

export const AppLayout = observer(() => {
    const matches = useMatches();
    const fillViewport = matches.some((match) => match.handle?.fillViewport);

    return (
        <AppLayoutShell fillViewport={fillViewport}>
            <Outlet />
        </AppLayoutShell>
    );
});

export const AppLayoutFrame = observer(({ children, fillViewport = false }: AppLayoutShellProps) => {
    return <AppLayoutShell fillViewport={fillViewport}>{children}</AppLayoutShell>;
});
