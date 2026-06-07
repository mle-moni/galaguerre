import { Popover, Text } from "@mantine/core";
import clsx from "clsx";
import { useState, type MouseEvent, type ReactNode } from "react";

interface MobileStatBadgeProps {
    value: ReactNode;
    label: string;
    description: string;
    className: string;
}

export const MobileStatBadge = ({ value, label, description, className }: MobileStatBadgeProps) => {
    const [opened, setOpened] = useState(false);

    const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
        event.stopPropagation();
        setOpened((current) => !current);
    };

    return (
        <Popover
            opened={opened}
            onChange={setOpened}
            width={220}
            position="bottom"
            withArrow
            shadow="md"
            withinPortal
        >
            <Popover.Target>
                <span
                    data-stat-badge
                    className={clsx(
                        "mobile-bar__badge",
                        "mobile-bar__badge--interactive",
                        className,
                    )}
                    onClick={handleClick}
                    aria-label={label}
                >
                    {value}
                </span>
            </Popover.Target>
            <Popover.Dropdown onClick={(event) => event.stopPropagation()}>
                <Text size="sm" fw={700}>
                    {label}
                </Text>
                <Text size="xs" c="dimmed">
                    {description}
                </Text>
            </Popover.Dropdown>
        </Popover>
    );
};
