import { getErrorMessage } from "~/helpers/get_error_message";
import { GAME_STORE } from "~/stores/store_singletons";
import { notifyError } from "./toasts.js";

export const notifyGameError = (error: unknown, backupMessage?: string) => {
    const text = getErrorMessage(error, backupMessage);

    if (GAME_STORE.hasActiveGame) {
        GAME_STORE.showFeedbackHint(text);
        return;
    }

    notifyError(text);
};
