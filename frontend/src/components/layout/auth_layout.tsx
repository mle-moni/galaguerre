import type { ReactNode } from "react";

interface AuthLayoutProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer?: ReactNode;
}

export const AuthLayout = ({ title, subtitle, children, footer }: AuthLayoutProps) => {
    return (
        <div className="gg-page-bg flex items-center justify-center min-h-screen p-4">
            <div className="gg-panel w-full max-w-md">
                <div className="text-center pt-8 pb-2 px-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gg-gold m-0">Galaguerre</h1>
                    <p className="text-white/70 text-sm mt-1 mb-0">Jeu de cartes stratégique</p>
                </div>
                <div className="gg-panel-body">
                    <h2 className="text-xl font-semibold text-white m-0 mb-1">{title}</h2>
                    {subtitle && <p className="text-white/60 text-sm m-0 mb-6">{subtitle}</p>}
                    {!subtitle && <div className="mb-6" />}
                    {children}
                </div>
                {footer && (
                    <div className="text-center pb-6 px-6 text-sm text-white/70">{footer}</div>
                )}
            </div>
        </div>
    );
};
