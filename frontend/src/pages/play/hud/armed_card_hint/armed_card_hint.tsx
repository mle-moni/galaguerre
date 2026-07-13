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

    if (targetSelectionStore.isSelectingTarget) {
        const isSpell = targetSelectionStore.pendingPlay?.kind === "SPELL";
        const hint = isMobile
            ? isSpell
                ? "Choisissez la cible du sort"
                : "Choisissez la cible du cri de guerre"
            : isSpell
              ? "Choisissez une cible valide pour lancer le sort · Échap pour annuler"
              : "Choisissez une cible valide pour résoudre le cri de guerre · Échap pour annuler";

        return (
            <div className={`${hintClassName} armed-card-hint--targeting`} role="status">
                <span>{hint}</span>
                {isMobile && (
                    <Button
                        className="armed-card-hint__cancel"
                        size="compact-xs"
                        variant="subtle"
                        color="yellow"
                        aria-label="Annuler la sélection de cible"
                        onClick={handleCancel}
                    >
                        Annuler
                    </Button>
                )}
            </div>
        );
    }

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
                        className="armed-card-hint__cancel"
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
                        className="armed-card-hint__cancel"
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
                        className="armed-card-hint__cancel"
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

    if (!targetSelectionStore.isArmed) return null;

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
                <Button
                    className="armed-card-hint__cancel"
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
});
