import type { GamePlayer } from "#api_types/game.types";

import { Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import type { PointerEvent } from "react";
import clsx from "clsx";
import { useGameContext } from "~/hooks/use_game_state";
import "./player_infos.css";

interface PlayerInfosProps {
    player: GamePlayer;
    isOpponent?: boolean;
}

export const PlayerInfos = observer<PlayerInfosProps>(({ player, isOpponent = false }) => {
    const { store } = useGameContext();

    const playerBorderColor = store.playerInfosStore.getBorderColor({
        isOpponent,
    });

    const minionAttackBorderColor = store.minionDragStore.getPlayerBorderColor(isOpponent);
    const weaponAttackBorderColor = store.weaponDragStore.getOpponentHeroBorderColor(isOpponent);
    const targetSelectionBorderColor = store.targetSelectionStore.getHeroBorderColor(isOpponent);
    const dropZoneBorderColor =
        targetSelectionBorderColor !== "RGBa(0, 0, 0, 0)"
            ? targetSelectionBorderColor
            : weaponAttackBorderColor !== "RGBa(0, 0, 0, 0)"
              ? weaponAttackBorderColor
              : minionAttackBorderColor;

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

    return (
        <div
            data-target-zone
            data-spot-id="hero"
            data-spot-owner={isOpponent ? "OPPONENT" : "PLAYER"}
            className={clsx(
                "border-2 border-dashed w-full mx-2",
                isInteractiveTarget && "hero-target--interactive",
            )}
            style={{
                borderColor: dropZoneBorderColor,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <div
                className={`hero-panel${canAttackWithWeapon ? " hero-panel--weapon-draggable" : ""}`}
                style={{
                    borderColor: playerBorderColor,
                }}
                onPointerDown={canAttackWithWeapon ? handleWeaponAttackPointerDown : undefined}
            >
                <Text className="hero-panel__pseudo" size="lg" ta="center" fw={700}>
                    {player.pseudo}
                </Text>
                <div className="hero-panel__stats">
                    <div className="hero-panel__stat">
                        <span className="hero-panel__stat-badge hero-panel__stat-badge--health">
                            {player.health}
                        </span>
                        <span className="hero-panel__stat-label">pdv</span>
                    </div>
                    <div className="hero-panel__stat">
                        <span className="hero-panel__stat-badge hero-panel__stat-badge--mana">
                            {player.mana}
                        </span>
                        <span className="hero-panel__stat-label">mana</span>
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
