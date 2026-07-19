import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { gameMusicPlayer } from "~/game_music/player";
import { useGameContext } from "~/hooks/use_game_state";
import { readSoundEnabled, subscribeSoundEnabled } from "~/cuelume/preferences";

/**
 * Starts battle BGM at mulligan (or mid-match join) and fades it out when
 * the game finishes. Respects `galaguerre:sound-enabled`.
 */
export const GameMusicController = observer(() => {
    const { store } = useGameContext();
    const gameId = store.authoritativeGame.id;
    const shouldPlay = !store.isFinished;

    useEffect(() => {
        gameMusicPlayer.setSoundEnabled(readSoundEnabled());
        return subscribeSoundEnabled(() => {
            gameMusicPlayer.setSoundEnabled(readSoundEnabled());
        });
    }, []);

    useEffect(() => {
        if (shouldPlay) {
            gameMusicPlayer.start(gameId);
        } else {
            gameMusicPlayer.stop();
        }
    }, [shouldPlay, gameId]);

    useEffect(() => {
        return () => {
            gameMusicPlayer.dispose();
        };
    }, []);

    return null;
});
