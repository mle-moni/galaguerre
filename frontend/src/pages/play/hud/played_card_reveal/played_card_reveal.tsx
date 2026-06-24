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

    return (
        <div className="played-card-reveal" aria-hidden>
            <PlayerCardFace card={card} size="full" spellPower={player.spellPower} />
        </div>
    );
});
