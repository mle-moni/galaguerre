import type { GamePlayer } from "#api_types/game.types";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { CARD_BACK_IMAGE_URL } from "~/components/cards/card_back_face";
import { useGameContext } from "~/hooks/use_game_state";
import { CUELUME_TOGGLE } from "~/cuelume/sound_props";
import { CountdownTimer } from "../countdown_timer/countdown_timer.jsx";
import { TURN_TIMER_DISPLAY_OFFSET_SECONDS } from "../../play_game_constants.js";
import "./decks_infos.css";

interface DecksInfosProps {
    me: GamePlayer;
    opponent: GamePlayer;
}

export const DecksInfos = observer(({ me, opponent }: DecksInfosProps) => {
    const { authoritativeGame } = useGameContext();
    const currentRound = authoritativeGame.data.currentRound;

    return (
        <div className="decks-infos">
            <br />
            <br />
            <DeckInfosRow player={opponent} animationOwner="OPPONENT" />
            <div className="decks-infos__turn-row">
                <TurnTimer />
                <p className="decks-infos__turn-banner">Tour {currentRound}</p>
            </div>
            <DeckInfosRow player={me} animationOwner="PLAYER" />
            <PassTurnSection />
        </div>
    );
});

interface DeckInfosRowProps {
    player: GamePlayer;
    animationOwner: "OPPONENT" | "PLAYER";
}

const DeckInfosRow = observer(({ player, animationOwner }: DeckInfosRowProps) => {
    const numberOfCards = player.deckCards.length;
    const iconSize = getIconSize(numberOfCards);

    return (
        <div className="deck-infos-row" data-animation-deck data-animation-owner={animationOwner}>
            <span className="deck-infos-row__count">{numberOfCards}</span>
            <img
                className="deck-infos-row__card-back"
                src={CARD_BACK_IMAGE_URL}
                alt=""
                draggable={false}
                style={{ height: iconSize, aspectRatio: "5 / 7" }}
            />
        </div>
    );
});

const TurnTimer = observer(() => {
    const { store } = useGameContext();

    return (
        <CountdownTimer
            endsAt={store.game.data.turnEndsAt}
            displayOffsetSeconds={TURN_TIMER_DISPLAY_OFFSET_SECONDS}
            title={
                store.isMyTurn
                    ? "Temps restant pour votre tour"
                    : "Temps restant pour le tour de l'adversaire"
            }
        />
    );
});

const PassTurnSection = observer(() => {
    const { store } = useGameContext();

    return (
        <div className="decks-infos__pass-turn">
            <div className="decks-infos__pass-turn-btn-wrap">
                <button
                    type="button"
                    className={clsx(
                        "pass-turn-button",
                        store.isPassTurnPending && "pass-turn-button--loading",
                    )}
                    disabled={!store.canPassTurn || store.isPassTurnPending}
                    onClick={() => store.requestPassTurn()}
                    {...CUELUME_TOGGLE}
                >
                    Terminer
                </button>
            </div>
        </div>
    );
});

const getIconSize = (numCards: number): number => {
    const NUM_CARDS_MIN = 0;
    const NUM_CARDS_MAX = 30;
    const MIN_SIZE = 44;
    const MAX_SIZE = 88;

    const numCardOrMax = numCards > NUM_CARDS_MAX ? NUM_CARDS_MAX : numCards;

    return (
        MIN_SIZE +
        ((numCardOrMax - NUM_CARDS_MIN) / (NUM_CARDS_MAX - NUM_CARDS_MIN)) * (MAX_SIZE - MIN_SIZE)
    );
};
