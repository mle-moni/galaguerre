import { observer } from "mobx-react-lite";
import { MarkedDiscardCard } from "~/components/cards/marked_discard_card";
import { PlayerCardFace } from "~/components/cards/player_card_face";
import { useGameContext } from "~/hooks/use_game_state";
import type { PlayedCardRevealVariant } from "~/stores/PlayedCardRevealStore";
import "./played_card_reveal.css";

const REVEAL_ARIA_LABELS: Record<PlayedCardRevealVariant, string> = {
    played: "Masquer la carte jouée",
    overdraw: "Masquer la carte surpiochée",
    castWhenDrawn: "Masquer la carte lancée quand piochée",
};

export const PlayedCardReveal = observer(() => {
    const { store } = useGameContext();
    const { card, playerId, variant } = store.playedCardRevealStore;

    if (!card || playerId === null) return null;

    const player =
        store.game.data.playerOne.userId === playerId
            ? store.game.data.playerOne
            : store.game.data.playerTwo;

    const dismiss = () => store.playedCardRevealStore.clear();

    const cardFace = <PlayerCardFace card={card} size="full" spellPower={player.spellPower} />;

    return (
        <div
            className="played-card-reveal"
            role="button"
            tabIndex={0}
            aria-label={REVEAL_ARIA_LABELS[variant]}
            onClick={dismiss}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    dismiss();
                }
            }}
        >
            {variant === "overdraw" ? (
                <MarkedDiscardCard bannerText="Surpioche">{cardFace}</MarkedDiscardCard>
            ) : (
                cardFace
            )}
        </div>
    );
});
