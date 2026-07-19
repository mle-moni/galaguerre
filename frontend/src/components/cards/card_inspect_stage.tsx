import type { CardRarity } from "#api_types/card_rarity.types";
import clsx from "clsx";
import { useEffect, useState, type AnimationEvent, type ReactNode } from "react";
import { CardBackFace } from "./card_back_face.jsx";
import { HoloCardShell } from "./holo_card_shell.jsx";
import "./card_inspect_stage.css";

const INTRO_MS = 1000;
const INTRO_FALLBACK_MS = INTRO_MS + 100;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const INTRO_ANIMATION_NAME = "card-inspect-pop";

interface CardInspectStageProps {
    rarity: CardRarity;
    isGolden?: boolean;
    onClose: () => void;
    children: ReactNode;
    sideContent?: ReactNode;
    className?: string;
}

export const CardInspectStage = ({
    rarity,
    isGolden = false,
    onClose,
    children,
    sideContent,
    className,
}: CardInspectStageProps) => {
    const [introDone, setIntroDone] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false,
    );

    useEffect(() => {
        if (typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches) {
            setIntroDone(true);
            return;
        }

        setIntroDone(false);
        const timeoutId = window.setTimeout(() => setIntroDone(true), INTRO_FALLBACK_MS);
        return () => window.clearTimeout(timeoutId);
    }, []);

    const handleIntroEnd = (event: AnimationEvent<HTMLDivElement>) => {
        if (event.animationName !== INTRO_ANIMATION_NAME) return;
        setIntroDone(true);
    };

    return (
        <div
            className={clsx("card-inspect-stage", className)}
            onClick={onClose}
            role="presentation"
        >
            <button
                type="button"
                className="card-inspect-stage__close"
                aria-label="Fermer"
                onClick={onClose}
            >
                ×
            </button>

            <div
                className={clsx(
                    "card-inspect-stage__layout",
                    sideContent && "card-inspect-stage__layout--with-side",
                )}
                onClick={(event) => event.stopPropagation()}
                role="presentation"
            >
                <div className="card-inspect-stage__card-col">
                    <div
                        className={clsx(
                            "card-inspect-flip",
                            introDone && "card-inspect-flip--ready",
                        )}
                    >
                        <div className="card-inspect-flip__inner" onAnimationEnd={handleIntroEnd}>
                            <div className="card-inspect-flip__face card-inspect-flip__face--front">
                                <HoloCardShell
                                    rarity={rarity}
                                    isGolden={isGolden}
                                    tiltEnabled={introDone}
                                    className="card-inspect-stage__shell"
                                >
                                    {children}
                                </HoloCardShell>
                            </div>
                            <div className="card-inspect-flip__face card-inspect-flip__face--back">
                                <CardBackFace className="playing-card-face--full card-inspect-flip__back-face" />
                            </div>
                        </div>
                    </div>
                </div>
                {sideContent}
            </div>
        </div>
    );
};
