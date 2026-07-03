import type { ReactNode } from "react";

interface HomePanelProps {
    title: string;
    headerRight?: ReactNode;
    children: ReactNode;
    className?: string;
}

export const HomePanel = ({ title, headerRight, children, className = "" }: HomePanelProps) => (
    <section className={`home-panel ${className}`.trim()}>
        <div className="home-panel__header">
            <h2 className="home-panel__title">{title}</h2>
            {headerRight}
        </div>
        <div className="home-panel__body">{children}</div>
    </section>
);
