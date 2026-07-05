import type { GamePlayer } from "#api_types/game.types";

import clsx from "clsx";
import { IconHeart } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import type { PointerEvent } from "react";
import { UserAvatar } from "~/components/user_avatar";
import { useGameContext } from "~/hooks/use_game_state";
import {
    getMaxMana,
    PLAY_DECK_ICON_URL,
    PLAY_MANA_MEDALLION_URL,
} from "~/pages/play/play_game_constants";
import "~/components/targeting/targeting.css";
import "~/pages/play/animations/hero_death_animations.css";
import "./player_infos.css";

interface PlayerInfosProps {
    player: GamePlayer;
    label: string;
    isOpponent?: boolean;
}

export const PlayerInfos = observer<PlayerInfosProps>(({ player, label, isOpponent = false }) => {
    const { store, authoritativeGame } = useGameContext();
    const maxMana = getMaxMana(authoritativeGame.data.currentRound);

    const playerBorderColor = store.playerInfosStore.getBorderColor({
        isOpponent,
    });

    const minionAttackBorderColor = store.minionDragStore.getPlayerBorderColor(isOpponent);
    const weaponAttackBorderColor = store.weaponDragStore.getOpponentHeroBorderColor(isOpponent);
    const targetSelectionBorderColor = store.targetSelectionStore.getHeroBorderColor(isOpponent);
    const heroHighlight = store.getHeroTargetHighlight(isOpponent);
    const dropZoneBorderColor =
        heroHighlight === "none"
            ? targetSelectionBorderColor !== "RGBa(0, 0, 0, 0)"
                ? targetSelectionBorderColor
                : weaponAttackBorderColor !== "RGBa(0, 0, 0, 0)"
                  ? weaponAttackBorderColor
                  : minionAttackBorderColor
            : undefined;

    const canAttackWithWeapon = !isOpponent && store.weaponDragStore.canAttackWithWeapon;
    const isInteractiveTarget =
        store.targetSelectionStore.isHighlightingTargets ||
        store.minionDragStore.isAttacking ||
        store.weaponDragStore.isAttacking;

    const handleClick = () => {
        handleDrop();
    };

    const handleDrop = () => {
        store.handleDrop(null, isOpponent ? "OPPONENT" : "PLAYER");
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!store.targetSelectionStore.isHighlightingTargets) return;

        e.preventDefault();
    };

    const handleWeaponAttackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (!canAttackWithWeapon) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        const rect = event.currentTarget.getBoundingClientRect();
        const origin = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };

        store.weaponDragStore.startAttack();
        store.targetingArrowStore.beginDrag(origin, { x: event.clientX, y: event.clientY });
    };

    const heroSpotOwner = isOpponent ? "OPPONENT" : "PLAYER";
    const isDying = store.narrativeDirector.dyingHeroOwners.includes(heroSpotOwner);
    const deckCount = player.deckCards.length;

    return (
        <div
            data-target-zone
            data-spot-id="hero"
            data-spot-owner={isOpponent ? "OPPONENT" : "PLAYER"}
            className={clsx(
                "hero-panel-wrapper",
                heroHighlight === "none" && "border-2 border-dashed rounded-xl",
                heroHighlight === "none" && isInteractiveTarget && "hero-target--interactive",
                heroHighlight === "valid" && "target-zone--valid",
                heroHighlight === "invalid" && "target-zone--invalid",
            )}
            style={{
                borderColor: dropZoneBorderColor,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <div
                className={clsx(
                    "hero-panel",
                    canAttackWithWeapon && "hero-panel--weapon-draggable",
                    isDying && "hero-target--dying",
                )}
                style={{
                    borderColor: playerBorderColor !== "white" ? playerBorderColor : undefined,
                }}
                onPointerDown={canAttackWithWeapon ? handleWeaponAttackPointerDown : undefined}
            >
                <p className="hero-panel__title">{label}</p>
                <div className="hero-panel__avatar-wrap">
                    <UserAvatar
                        pseudo={player.pseudo}
                        userId={player.userId}
                        className="hero-panel__avatar"
                        alt={player.pseudo}
                    />
                </div>
                <p className="hero-panel__pseudo" title={player.pseudo}>
                    {player.pseudo}
                </p>
                <div className="hero-panel__stats">
                    <div className="hero-panel__stat">
                        <IconHeart
                            className="hero-panel__stat-icon hero-panel__stat-icon--heart"
                            size={18}
                            stroke={2}
                            aria-hidden
                        />
                        <span className="hero-panel__stat-value">{player.health}</span>
                    </div>
                    <div className="hero-panel__stat">
                        <img
                            src={PLAY_MANA_MEDALLION_URL}
                            alt=""
                            className="hero-panel__stat-icon"
                            draggable={false}
                        />
                        <span className="hero-panel__stat-value">
                            {player.mana} / {maxMana}
                        </span>
                    </div>
                    <div className="hero-panel__stat">
                        <img
                            src={PLAY_DECK_ICON_URL}
                            alt=""
                            className="hero-panel__stat-icon"
                            draggable={false}
                        />
                        <span className="hero-panel__stat-label">
                            {deckCount} Carte{deckCount !== 1 ? "s" : ""} restante
                            {deckCount !== 1 ? "s" : ""}
                        </span>
                    </div>
                    {player.spellPower > 0 && (
                        <div
                            className="hero-panel__stat"
                            title={`+${player.spellPower} dégâts de sort`}
                        >
                            <span className="hero-panel__stat-badge hero-panel__stat-badge--spell-power">
                                +{player.spellPower}
                            </span>
                            <span className="hero-panel__stat-label">dégâts de sort</span>
                        </div>
                    )}
                    {player.weaponState && (
                        <div
                            className="hero-panel__stat"
                            title={
                                player.weaponState.originalCard.label ??
                                `Arme ${player.weaponState.damage}/${player.weaponState.durability}`
                            }
                        >
                            <span className="hero-panel__stat-badge hero-panel__stat-badge--weapon-damage">
                                {player.weaponState.damage}
                            </span>
                            <span className="hero-panel__stat-badge hero-panel__stat-badge--weapon-durability">
                                {player.weaponState.durability}
                            </span>
                            <span className="hero-panel__stat-label">arme</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
