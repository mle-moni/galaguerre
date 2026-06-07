import { observer } from "mobx-react-lite";
import { useGameContext } from "~/hooks/use_game_state";
import "./armed_card_hint.css";

export const ArmedCardHint = observer(() => {
    const { store } = useGameContext();
    const { targetSelectionStore, cardDragStore } = store;

    if (cardDragStore.isShowingMinionPlayHint) {
        return (
            <div className="armed-card-hint" role="status">
                Glissez la carte vers le plateau pour la jouer · Échap pour annuler
            </div>
        );
    }

    if (!targetSelectionStore.isArmed || targetSelectionStore.isSelectingTarget) return null;

    const hint = targetSelectionStore.armedCardRequiresTarget
        ? "Glissez vers une cible, cliquez sur une cible valide, ou recliquez sur la carte · Échap pour annuler"
        : "Cliquez à nouveau sur la carte pour confirmer · Échap pour annuler";

    return (
        <div className="armed-card-hint" role="status">
            {hint}
        </div>
    );
});
