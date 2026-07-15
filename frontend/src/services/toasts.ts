import { createElement } from "react";
import { toast } from "react-toastify";
import { play } from "~/cuelume/index";
import { OpponentWaitingToastContent } from "~/components/matchmaking/opponent_waiting_toast_content";
import { getErrorMessage } from "../helpers/get_error_message.js";

const OPPONENT_WAITING_TOAST_AUTO_CLOSE_MS = 20_000;

let opponentWaitingToastId: string | number | null = null;

export const dismissOpponentWaitingToast = () => {
    if (opponentWaitingToastId === null) return;

    toast.dismiss(opponentWaitingToastId);
    opponentWaitingToastId = null;
};

export const notifyOpponentWaiting = ({ onJoin }: { onJoin: () => void }) => {
    dismissOpponentWaitingToast();

    opponentWaitingToastId = toast(
        createElement(OpponentWaitingToastContent, {
            onJoin: () => {
                dismissOpponentWaitingToast();
                onJoin();
            },
        }),
        {
            type: "info",
            position: "bottom-right",
            style: { bottom: 20 },
            autoClose: OPPONENT_WAITING_TOAST_AUTO_CLOSE_MS,
            closeOnClick: false,
        },
    );

    return opponentWaitingToastId;
};

export const notifyApiError = (error: unknown, backupMessage?: string) => {
    const text = getErrorMessage(error, backupMessage);

    notifyError(text);
};

export const notifyError = (message: string) => {
    toast(message, {
        type: "error",
        position: "bottom-right",
        style: { bottom: 20 },
    });
};

export const notifySuccess = (message: string) => {
    play("success");
    toast(message, {
        type: "success",
        position: "bottom-right",
        style: { bottom: 20 },
    });
};
