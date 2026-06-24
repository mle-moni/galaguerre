import type { MinionCard, PlayerCard, SpellCard, WeaponCard } from "#api_types/game.types";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import type { MinionAttackStatus } from "~/helpers/minion_combat";
import { MinionCardFace } from "./minion_card_face.jsx";
import { SpellCardFace } from "./spell_card_face.jsx";
import { WeaponCardFace } from "./weapon_card_face.jsx";

export type CardFaceSize = "default" | "full";

interface PlayerCardFaceProps {
    card: PlayerCard;
    size?: CardFaceSize;
    className?: string;
    style?: CSSProperties;
    spellPower?: number;
    isSilenced?: boolean;
    attack?: number;
    health?: number;
    attackStatus?: MinionAttackStatus;
    remainingAttacks?: number;
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onClick?: () => void;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    wrapper?: (content: ReactNode) => ReactNode;
}

export const PlayerCardFace = ({
    card,
    size = "default",
    className,
    style,
    spellPower = 0,
    isSilenced,
    attack,
    health,
    attackStatus,
    remainingAttacks,
    draggable,
    onDragStart,
    onDragEnd,
    onClick,
    onPointerDown,
    wrapper,
}: PlayerCardFaceProps) => {
    const sizeClassName = size === "full" ? "playing-card-face--full" : undefined;
    const mergedClassName = clsx(sizeClassName, className);

    if (card.type === "WEAPON") {
        return (
            <WeaponCardFace
                card={card as WeaponCard}
                style={style}
                className={mergedClassName}
                spellPower={spellPower}
                onClick={onClick}
                wrapper={wrapper}
            />
        );
    }

    if (card.type === "SPELL") {
        return (
            <SpellCardFace
                card={card as SpellCard}
                style={style}
                className={mergedClassName}
                spellPower={spellPower}
                onClick={onClick}
                onPointerDown={onPointerDown}
                wrapper={wrapper}
            />
        );
    }

    return (
        <MinionCardFace
            card={card as MinionCard}
            attack={attack ?? card.attack}
            health={health ?? card.health}
            style={style}
            className={mergedClassName}
            spellPower={spellPower}
            isSilenced={isSilenced}
            attackStatus={attackStatus}
            remainingAttacks={remainingAttacks}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onClick}
            onPointerDown={onPointerDown}
            wrapper={wrapper}
        />
    );
};
