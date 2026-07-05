import { Popover, Text } from "@mantine/core";
import { useState, type MouseEvent } from "react";
import {
    CountdownTimerFace,
    useCountdownTimer,
} from "../countdown_timer/countdown_timer.jsx";
import "../countdown_timer/countdown_timer.css";

interface MobileCountdownTimerProps {
    endsAt?: number;
    label: string;
    description: string;
}

export const MobileCountdownTimer = ({ endsAt, label, description }: MobileCountdownTimerProps) => {
    const secondsLeft = useCountdownTimer(endsAt);
    const [opened, setOpened] = useState(false);

    const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
        event.stopPropagation();
        setOpened((current) => !current);
    };

    if (secondsLeft === null) return null;

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
                    className="countdown-timer mobile-bar__timer"
                    onClick={handleClick}
                    aria-label={label}
                >
                    <CountdownTimerFace seconds={secondsLeft} />
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
