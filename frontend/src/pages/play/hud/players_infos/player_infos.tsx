import type { GamePlayer } from "#api_types/game.types";

import { Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
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

    const canDragWeapon = !isOpponent && store.weaponDragStore.canDragWeapon;

    const handleDrop = () => {
        store.handleDrop(null, isOpponent ? "OPPONENT" : "PLAYER");
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        const minion = store.minionDragStore.minionDragged;
        const isSelectingTarget = store.targetSelectionStore.isSelectingTarget;
        const isWeaponDragging = store.weaponDragStore.isDragging;

        if (!minion && !isSelectingTarget && !isWeaponDragging) return;

        e.preventDefault();
    };

    const handleWeaponDragStart = () => {
        if (!canDragWeapon) return;
        store.weaponDragStore.setWeaponDragging(true);
    };

    const handleWeaponDragEnd = () => {
        store.weaponDragStore.setWeaponDragging(false);
    };

    return (
        <div
            data-target-zone
            data-spot-id="hero"
            data-spot-owner={isOpponent ? "OPPONENT" : "PLAYER"}
            className="border-2 border-dashed w-full mx-2"
            style={{
                borderColor: dropZoneBorderColor,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className={`hero-panel${canDragWeapon ? " hero-panel--weapon-draggable" : ""}`}
                style={{
                    borderColor: playerBorderColor,
                }}
                draggable={canDragWeapon}
                onDragStart={handleWeaponDragStart}
                onDragEnd={handleWeaponDragEnd}
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
