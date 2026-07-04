import { observer } from "mobx-react-lite";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import "./played_card_reveal.css";

export const PlayedCardReveal = observer(() => {
    const { store } = useGameContext();
    const { card, playerId } = store.playedCardRevealStore;

    if (!card || playerId === null) return null;

    const player =
        store.game.data.playerOne.userId === playerId
            ? store.game.data.playerOne
            : store.game.data.playerTwo;

    const dismiss = () => store.playedCardRevealStore.clear();

    return (
        <div
            className="played-card-reveal"
            role="button"
            tabIndex={0}
            aria-label="Masquer la carte jouée"
            onClick={dismiss}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    dismiss();
                }
            }}
        >
            <PlayerCardFace card={card} size="full" spellPower={player.spellPower} />
        </div>
    );
});
