import { Button } from "@mantine/core";

type OpponentWaitingToastContentProps = {
    onJoin: () => void;
};

export const OpponentWaitingToastContent = ({ onJoin }: OpponentWaitingToastContentProps) => {
    return (
        <div className="flex items-center gap-3">
            <span>Un joueur cherche une partie</span>
            <Button size="xs" variant="filled" color="gold" onClick={onJoin}>
                Rejoindre
            </Button>
        </div>
    );
};
