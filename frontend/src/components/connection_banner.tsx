import { useSocketConnectionStatus } from "~/hooks/use_socket_connection";
import "./connection_banner.css";

export const ConnectionBanner = () => {
    const status = useSocketConnectionStatus();

    if (status === "connected") return null;

    return (
        <div className={`connection-banner connection-banner--${status}`} role="status">
            {status === "reconnecting"
                ? "Reconnexion en cours..."
                : "Connexion perdue — rafraîchissez la page"}
        </div>
    );
};
