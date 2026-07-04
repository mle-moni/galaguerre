import { Tooltip } from "@mantine/core";

interface CardCopyCountBadgeProps {
    count: number;
}

export const CardCopyCountBadge = ({ count }: CardCopyCountBadgeProps) => {
    if (count <= 1) return null;

    return (
        <Tooltip label="Nombre d'exemplaires possédés" withArrow>
            <span className="card-copy-count-badge">x{count}</span>
        </Tooltip>
    );
};
