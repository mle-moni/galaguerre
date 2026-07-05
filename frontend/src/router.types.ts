import type { UIMatch } from "react-router";

export interface AppRouteHandle {
    fillViewport?: boolean;
    public?: boolean;
}

type AppUIMatch = UIMatch<unknown, AppRouteHandle>;

declare module "react-router" {
    export function useMatches(): AppUIMatch[];
}

declare module "react-router-dom" {
    export function useMatches(): AppUIMatch[];
}
