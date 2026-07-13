import {
    IconCards,
    IconDiamondFilled,
    IconHeartFilled,
    IconStack2,
    IconSword,
} from "@tabler/icons-react";
import { Popover, Text } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { CardPreviewSheet } from "~/components/cards/card_preview_sheet";
import { useAvatarImageUrl } from "~/hooks/use_avatar_image_url";
import { useGameContext } from "~/hooks/use_game_state";
import { getMaxMana } from "~/pages/play/play_game_constants";
import type { GamePlayer } from "#api_types/game.types";
import "~/components/targeting/targeting.css";
import "~/pages/play/animations/hero_death_animations.css";
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
        const { store, authoritativeGame } = useGameContext();
        const avatarImageUrl = useAvatarImageUrl(player.avatarCardId);
        const [weaponSheetOpened, setWeaponSheetOpened] = useState(false);
        const [weaponInfoOpened, setWeaponInfoOpened] = useState(false);
        const maxMana = getMaxMana(authoritativeGame.data.currentRound);

        const minionAttackBorderColor = store.minionDragStore.getPlayerBorderColor(isOpponent);
        const weaponAttackBorderColor =
            store.weaponDragStore.getOpponentHeroBorderColor(isOpponent);
        const targetSelectionBorderColor =
            store.targetSelectionStore.getHeroBorderColor(isOpponent);
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
        const weaponLabel = player.weaponState?.originalCard.label;
        const isInteractiveTarget =
            store.targetSelectionStore.isHighlightingTargets ||
            store.minionDragStore.isAttacking ||
            store.weaponDragStore.isAttacking;

        const heroSpotOwner = isOpponent ? "OPPONENT" : "PLAYER";
        const isDying = store.narrativeDirector.dyingHeroOwners.includes(heroSpotOwner);

        const isHeroStripControl = (target: EventTarget | null) => {
            const element =
                target instanceof Element
                    ? target
                    : target instanceof Node
                      ? target.parentElement
                      : null;

            return (
                element?.closest("[data-stat-badge]") ||
                element?.closest("[data-weapon-preview]") ||
                element?.closest("[data-weapon-attack]")
            );
        };

        const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
            if (isHeroStripControl(event.target) || weaponSheetOpened) {
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

        const weaponDescription = weaponLabel
            ? `${weaponLabel} : dégâts par attaque, puis durabilité restante.`
            : "Dégâts par attaque, puis durabilité restante de l'arme équipée.";

        const handleWeaponStatClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            setWeaponInfoOpened((current) => !current);
        };

        const handleWeaponPreviewClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            event.preventDefault();
            setWeaponSheetOpened(true);
        };

        const handleWeaponPreviewPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
            event.stopPropagation();
        };

        const handleWeaponAttackClick = (event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            event.preventDefault();

            if (store.weaponDragStore.isAttacking) {
                store.weaponDragStore.cancelAttack();
                return;
            }

            store.targetSelectionStore.disarm();
            store.cardDragStore.clearMinionPlayHint();
            store.minionDragStore.cancelAttack();
            store.weaponDragStore.startAttack();
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
                className={clsx(
                    "mobile-bar__hero-target",
                    canAttackWithWeapon && "mobile-bar__hero-target--weapon-draggable",
                    heroHighlight === "none" &&
                        isInteractiveTarget &&
                        "mobile-bar__hero-target--interactive",
                    heroHighlight === "valid" && "target-zone--valid",
                    heroHighlight === "invalid" && "target-zone--invalid",
                    isDying && "hero-target--dying",
                )}
                style={{ borderColor: dropZoneBorderColor }}
                onDragOver={handleDragOver}
                onDrop={handleClick}
                onClick={handleClick}
            >
                <div className="mobile-bar__avatar-column">
                    <div className="mobile-bar__avatar-wrap">
                        <img
                            className="mobile-bar__avatar"
                            src={avatarImageUrl ?? "/card-covers/galadrim/joseph.webp"}
                            alt={`Profil de ${player.pseudo}`}
                            draggable={false}
                        />
                    </div>
                    <span className="mobile-bar__pseudo">{player.pseudo}</span>
                </div>
                <div className="mobile-bar__weapon-slot" aria-hidden={!player.weaponState}>
                    {player.weaponState && (
                        <div className="mobile-bar__weapon">
                            <Popover
                                opened={weaponInfoOpened}
                                onChange={setWeaponInfoOpened}
                                width={220}
                                position="bottom"
                                withArrow
                                shadow="md"
                                withinPortal
                            >
                                <Popover.Target>
                                    <div className="mobile-bar__weapon-panel">
                                        <button
                                            type="button"
                                            className="mobile-bar__weapon-stat"
                                            data-stat-badge
                                            aria-label="Statistiques de l'arme"
                                            onClick={handleWeaponStatClick}
                                        >
                                            <span
                                                className="mobile-bar__weapon-stat-icon"
                                                aria-hidden="true"
                                            >
                                                <IconSword />
                                            </span>
                                            <span>
                                                {player.weaponState.damage}/
                                                {player.weaponState.durability}
                                            </span>
                                        </button>
                                        <div className="mobile-bar__weapon-meta">
                                            <span className="mobile-bar__weapon-label">Arme</span>
                                            <button
                                                type="button"
                                                className="mobile-bar__weapon-preview"
                                                data-weapon-preview
                                                aria-label={
                                                    weaponLabel
                                                        ? `Voir ${weaponLabel}`
                                                        : "Voir l'arme équipée"
                                                }
                                                onPointerDown={handleWeaponPreviewPointerDown}
                                                onClick={handleWeaponPreviewClick}
                                            >
                                                i
                                            </button>
                                            {!isOpponent && canAttackWithWeapon && (
                                                <button
                                                    type="button"
                                                    className={clsx(
                                                        "mobile-bar__weapon-attack",
                                                        store.weaponDragStore.isAttacking &&
                                                            "mobile-bar__weapon-attack--active",
                                                    )}
                                                    data-weapon-attack
                                                    aria-label="Attaquer avec l'arme"
                                                    aria-pressed={store.weaponDragStore.isAttacking}
                                                    onPointerDown={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                    onClick={handleWeaponAttackClick}
                                                >
                                                    ⚔️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popover.Target>
                                <Popover.Dropdown onClick={(event) => event.stopPropagation()}>
                                    <Text size="sm" fw={700}>
                                        Statistiques de l&apos;arme
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        {weaponDescription}
                                    </Text>
                                </Popover.Dropdown>
                            </Popover>
                            <CardPreviewSheet
                                card={player.weaponState.originalCard}
                                opened={weaponSheetOpened}
                                onClose={() => setWeaponSheetOpened(false)}
                            />
                        </div>
                    )}
                </div>
                <div className="mobile-bar__stats">
                    <MobileStatBadge
                        value={player.health}
                        icon={<IconHeartFilled />}
                        label="Points de vie"
                        displayLabel="Santé"
                        description="Vie restante du héros. À 0, le joueur perd la partie."
                        className="mobile-bar__badge--health"
                    />
                    <MobileStatBadge
                        value={`${player.mana}/${maxMana}`}
                        icon={<IconDiamondFilled />}
                        label="Mana"
                        description="Ressource dépensée pour jouer des cartes. Le maximum augmente chaque tour."
                        className="mobile-bar__badge--mana"
                    />
                    {handCount !== undefined && (
                        <MobileStatBadge
                            value={handCount}
                            icon={<IconCards />}
                            label="Cartes en main"
                            displayLabel="Main"
                            description="Nombre de cartes actuellement en main chez l'adversaire."
                            className="mobile-bar__badge--hand"
                        />
                    )}
                    {deckCount !== undefined && (
                        <MobileStatBadge
                            value={deckCount}
                            icon={<IconStack2 />}
                            label="Cartes dans le deck"
                            displayLabel="Deck"
                            description={
                                isOpponent
                                    ? "Nombre de cartes restantes à piocher dans le deck adverse."
                                    : "Nombre de cartes restantes à piocher dans votre deck."
                            }
                            className="mobile-bar__badge--deck"
                        />
                    )}
                </div>
            </div>
        );
    },
);
