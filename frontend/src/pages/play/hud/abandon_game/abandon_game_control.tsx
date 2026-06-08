import { Button, Modal, Text } from "@mantine/core";
import { IconFlag } from "@tabler/icons-react";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useGameContext } from "~/hooks/use_game_state";
import { abandonGame } from "~/services/ws_client";
import "./abandon_game_control.css";

export const AbandonGameControl = observer(() => {
    const { store } = useGameContext();
    const [confirmOpened, setConfirmOpened] = useState(false);

    if (store.isFinished) return null;

    const handleConfirm = () => {
        abandonGame();
        setConfirmOpened(false);
    };

    return (
        <>
            <button
                type="button"
                className="abandon-game-fab"
                aria-label="Abandonner la partie"
                onClick={() => setConfirmOpened(true)}
            >
                <IconFlag size={22} />
            </button>

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
        </>
    );
});
