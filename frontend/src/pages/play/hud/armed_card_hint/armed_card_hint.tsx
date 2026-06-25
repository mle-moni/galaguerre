import { Button } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { cancelArrowTargeting } from "~/helpers/arrow_target_validity";
import { useGameContext } from "~/hooks/use_game_state";
import "./armed_card_hint.css";

interface ArmedCardHintProps {
    isMobile?: boolean;
}

export const ArmedCardHint = observer(({ isMobile = false }: ArmedCardHintProps) => {
    const { store } = useGameContext();
    const { targetSelectionStore, cardDragStore, minionDragStore, weaponDragStore } = store;

    const handleCancel = () => {
        cancelArrowTargeting(store);
    };

    const hintClassName = [
        "armed-card-hint",
        "armed-card-hint--interactive",
        isMobile ? "armed-card-hint--mobile" : "",
    ]
        .filter(Boolean)
        .join(" ");

    if (cardDragStore.isShowingMinionPlayHint) {
        return (
            <div className={hintClassName} role="status">
                <span>
                    {isMobile
                        ? "Touchez le plateau pour choisir où placer le monstre"
                        : "Glissez la carte vers le plateau pour la jouer · Échap pour annuler"}
                </span>
                {isMobile && (
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        color="yellow"
                        onClick={handleCancel}
                    >
                        Annuler
                    </Button>
                )}
            </div>
        );
    }

    if (minionDragStore.isAttacking) {
        return (
            <div className={hintClassName} role="status">
                <span>Touchez une cible ennemie pour attaquer</span>
                {isMobile && (
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        color="yellow"
                        onClick={handleCancel}
                    >
                        Annuler
                    </Button>
                )}
            </div>
        );
    }

    if (weaponDragStore.isAttacking) {
        return (
            <div className={hintClassName} role="status">
                <span>Touchez une cible ennemie pour attaquer avec votre arme</span>
                {isMobile && (
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        color="yellow"
                        onClick={handleCancel}
                    >
                        Annuler
                    </Button>
                )}
            </div>
        );
    }

    if (!targetSelectionStore.isArmed || targetSelectionStore.isSelectingTarget) return null;

    const hint = targetSelectionStore.armedCardRequiresTarget
        ? isMobile
            ? "Touchez une cible valide ou recliquez sur la carte"
            : "Glissez vers une cible, cliquez sur une cible valide, ou recliquez sur la carte · Échap pour annuler"
        : isMobile
          ? "Recliquez sur la carte pour confirmer"
          : "Cliquez à nouveau sur la carte pour confirmer · Échap pour annuler";

    return (
        <div className={hintClassName} role="status">
            <span>{hint}</span>
            {isMobile && (
                <Button size="compact-xs" variant="subtle" color="yellow" onClick={handleCancel}>
                    Annuler
                </Button>
            )}
        </div>
    );
});
