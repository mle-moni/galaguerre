import { Button, Modal, Text } from "@mantine/core";
import { IconFlag, IconQuestionMark } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { abandonGame } from "~/services/ws_client";
import { GameKeywordsGlossaryModal } from "./game_keywords_glossary_modal.jsx";
import "./game_hud_controls.css";

export const GameHudControls = observer(() => {
    const { store } = useGameContext();
    const [confirmOpened, setConfirmOpened] = useState(false);
    const [glossaryOpened, setGlossaryOpened] = useState(false);

    if (store.isFinished) return null;

    const handleConfirm = () => {
        abandonGame();
        setConfirmOpened(false);
    };

    return (
        <>
            <div className="game-hud-fabs">
                <button
                    type="button"
                    className="game-hud-fab game-hud-fab--abandon"
                    aria-label="Abandonner la partie"
                    onClick={() => setConfirmOpened(true)}
                >
                    <IconFlag size={22} />
                </button>
                <button
                    type="button"
                    className="game-hud-fab game-hud-fab--glossary"
                    aria-label="Glossaire des mots-clés"
                    onClick={() => setGlossaryOpened(true)}
                >
                    <IconQuestionMark size={22} />
                </button>
            </div>

            <Modal
                opened={confirmOpened}
                onClose={() => setConfirmOpened(false)}
                title="Abandonner la partie ?"
                centered
            >
                <Text size="sm" mb="lg">
                    Vous perdrez la partie. Cette action est irréversible.
                </Text>
                <div className="flex justify-end gap-2">
                    <Button variant="default" onClick={() => setConfirmOpened(false)}>
                        Annuler
                    </Button>
                    <Button color="red" onClick={handleConfirm}>
                        Abandonner
                    </Button>
                </div>
            </Modal>

            <GameKeywordsGlossaryModal
                opened={glossaryOpened}
                onClose={() => setGlossaryOpened(false)}
            />
        </>
    );
});
