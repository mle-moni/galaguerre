import type { GamePlayer } from "#api_types/game.types";
import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import { MobileStatBadge } from "./mobile_stat_badge.jsx";
import "./mobile.css";

interface MobileHeroStripProps {
    player: GamePlayer;
    isOpponent?: boolean;
    deckCount?: number;
    handCount?: number;
}

export const MobileHeroStrip = observer(
    ({ player, isOpponent = false, deckCount, handCount }: MobileHeroStripProps) => {
        const { store } = useGameContext();

        const minionAttackBorderColor = store.minionDragStore.getPlayerBorderColor(isOpponent);
        const weaponAttackBorderColor =
            store.weaponDragStore.getOpponentHeroBorderColor(isOpponent);
        const targetSelectionBorderColor =
            store.targetSelectionStore.getHeroBorderColor(isOpponent);
        const dropZoneBorderColor =
            targetSelectionBorderColor !== "RGBa(0, 0, 0, 0)"
                ? targetSelectionBorderColor
                : weaponAttackBorderColor !== "RGBa(0, 0, 0, 0)"
                  ? weaponAttackBorderColor
                  : minionAttackBorderColor;

        const canAttackWithWeapon = !isOpponent && store.weaponDragStore.canAttackWithWeapon;
        const weaponLabel = player.weaponState?.originalCard.label;

        const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target instanceof Element && event.target.closest("[data-stat-badge]")) {
                return;
            }

            if (!isOpponent && canAttackWithWeapon) {
                if (store.weaponDragStore.isAttacking) {
                    store.weaponDragStore.cancelAttack();
                    return;
                }

                store.targetSelectionStore.disarm();
                store.cardDragStore.clearMinionPlayHint();
                store.minionDragStore.cancelAttack();
                store.weaponDragStore.startAttack();
                return;
            }

            store.handleDrop(null, isOpponent ? "OPPONENT" : "PLAYER");
        };

        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
            if (!store.targetSelectionStore.isHighlightingTargets) return;
            e.preventDefault();
        };

        return (
            <div
                data-target-zone
                data-spot-id="hero"
                data-spot-owner={isOpponent ? "OPPONENT" : "PLAYER"}
                className={`mobile-bar__hero-target${canAttackWithWeapon ? " mobile-bar__hero-target--weapon-draggable" : ""}`}
                style={{ borderColor: dropZoneBorderColor }}
                onDragOver={handleDragOver}
                onDrop={handleClick}
                onClick={handleClick}
            >
                <span className="mobile-bar__pseudo">{player.pseudo}</span>
                <div className="mobile-bar__stats">
                    <MobileStatBadge
                        value={player.health}
                        label="Points de vie"
                        description="Vie restante du héros. À 0, le joueur perd la partie."
                        className="mobile-bar__badge--health"
                    />
                    <MobileStatBadge
                        value={player.mana}
                        label="Mana"
                        description="Ressource dépensée pour jouer des cartes. Le maximum augmente chaque tour."
                        className="mobile-bar__badge--mana"
                    />
                    {player.weaponState && (
                        <>
                            <MobileStatBadge
                                value={player.weaponState.damage}
                                label="Dégâts de l'arme"
                                description={
                                    weaponLabel
                                        ? `Dégâts infligés par ${weaponLabel} à chaque attaque.`
                                        : "Dégâts infligés par l'arme équipée à chaque attaque."
                                }
                                className="mobile-bar__badge--health"
                            />
                            <MobileStatBadge
                                value={player.weaponState.durability}
                                label="Durabilité de l'arme"
                                description={
                                    weaponLabel
                                        ? `Coups restants avant que ${weaponLabel} se brise.`
                                        : "Coups restants avant que l'arme se brise."
                                }
                                className="mobile-bar__badge--mana"
                            />
                        </>
                    )}
                    {deckCount !== undefined && (
                        <MobileStatBadge
                            value={deckCount}
                            label="Cartes dans le deck"
                            description={
                                isOpponent
                                    ? "Nombre de cartes restantes à piocher dans le deck adverse."
                                    : "Nombre de cartes restantes à piocher dans votre deck."
                            }
                            className="mobile-bar__badge--deck"
                        />
                    )}
                    {handCount !== undefined && (
                        <MobileStatBadge
                            value={`×${handCount}`}
                            label="Cartes en main"
                            description="Nombre de cartes actuellement en main chez l'adversaire."
                            className="mobile-bar__badge--deck"
                        />
                    )}
                </div>
            </div>
        );
    },
);
