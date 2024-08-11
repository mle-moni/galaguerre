import { toast } from "react-toastify";
import { getErrorMessage } from "../helpers/get_error_message.js";

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
    toast(message, {
        type: "success",
        position: "bottom-right",
        style: { bottom: 20 },
    });
};
