import { Link } from "react-router-dom";

export const formatPlayerName = (pseudo: string | null, userId: number) =>
    pseudo ?? `Joueur #${userId}`;

interface PlayerNameLinkProps {
    pseudo: string | null;
    userId: number;
    className?: string;
    stopPropagation?: boolean;
}

export const PlayerNameLink = ({
    pseudo,
    userId,
    className,
    stopPropagation = false,
}: PlayerNameLinkProps) => (
    <Link
        to={`/game-history/${userId}`}
        className={className ?? "no-underline hover:underline"}
        onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
    >
        {formatPlayerName(pseudo, userId)}
    </Link>
);
