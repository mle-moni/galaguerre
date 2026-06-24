import type { MinionCard } from "#api_types/game.types";
import { Image } from "@mantine/core";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import {
    getMinionAttackStatusLabel,
    getMinionCardMaxAttacks,
    type MinionAttackStatus,
} from "~/helpers/minion_combat";
import "./card_faces.css";

import { CardEffectSymbols } from "./card_effect_symbols.jsx";
import { CardFaceDescription } from "./card_face_description.jsx";

interface MinionCardFaceProps {
    card: MinionCard;
    attack: number;
    health: number;
    className?: string;
    style?: CSSProperties;
    spellPower?: number;
    isSilenced?: boolean;
    attackStatus?: MinionAttackStatus;
    remainingAttacks?: number;
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onClick?: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    wrapper?: (content: ReactNode) => ReactNode;
}

export const MinionCardFace = ({
    card,
    attack,
    health,
    className,
    style,
    spellPower = 0,
    isSilenced,
    attackStatus,
    remainingAttacks,
    draggable,
    onDragStart,
    onDragEnd,
    onClick,
    onPointerDown,
    wrapper = (content) => content,
}: MinionCardFaceProps) => {
    const maxAttacks = getMinionCardMaxAttacks(card);
    const showWindfuryBadge =
        attackStatus !== undefined &&
        attackStatus !== "idle" &&
        card.minionPowers?.hasWindfury &&
        remainingAttacks !== undefined;
    const statusLabel = attackStatus
        ? getMinionAttackStatusLabel(attackStatus, maxAttacks)
        : undefined;

    const content = (
        <div
            data-playing-card
            data-playing-card-id={card.uuid}
            style={style}
            className={clsx(
                "minion-card-face playing-card-face relative rounded bg-[#1e3a5f]",
                attackStatus && `minion-card-face--${attackStatus}`,
                className,
            )}
            title={statusLabel}
            draggable={draggable}
            onClick={onClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onPointerDown={onPointerDown}
        >
            <CardEffectSymbols card={card} />
            {attackStatus === "sleeping" && (
                <span className="minion-card-face__sleep-icon" aria-hidden>
                    💤
                </span>
            )}
            <div className="relative playing-card-face__image-area">
                <div className={clsx("cost", card.cost < card.baseCost && "cost--reduced")}>
                    {card.cost}
                </div>
                <Image
                    className="rounded-t h-full w-full object-cover"
                    src={card.imageUrl}
                    alt="Galaguerre card"
                    draggable={false}
                />
            </div>
            <div className="playing-card-face__body">
                <div className="playing-card-face__text">
                    <p className="playing-card-face__label">{card.label}</p>
                    <CardFaceDescription
                        card={card}
                        spellPower={spellPower}
                        isSilenced={isSilenced}
                    />
                </div>
            </div>
            <div className="playing-card-face__stats">
                <div className="relative">
                    <div className="attack">{attack}</div>
                    {showWindfuryBadge && (
                        <span className="minion-card-face__attacks-remaining">
                            {remainingAttacks}/{maxAttacks}
                        </span>
                    )}
                </div>
                <div className="health">{health}</div>
            </div>
        </div>
    );

    return <>{wrapper(content)}</>;
};
