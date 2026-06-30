import { observer } from "mobx-react-lite";
import { CardBackFace } from "~/components/cards/card_back_face";
import { useGameContext } from "~/hooks/use_game_state";
import "./discover_overlay.css";

export const DiscoverOpponentIndicator = observer(() => {
    const { store } = useGameContext();
    const pending = store.authoritativeGame.data.pendingDiscover;

    if (!pending || store.isDiscoverChooser) return null;

    return (
        <div
            className="discover-opponent-indicator"
            aria-live="polite"
            aria-label="Découverte en cours"
        >
            {pending.options.map((option) => (
                <div key={option.uuid} className="discover-opponent-indicator__card">
                    <CardBackFace cardUuid={option.uuid} />
                </div>
            ))}
        </div>
    );
});
