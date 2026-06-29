import { Group, Image, Text, Tooltip, type TextProps } from "@mantine/core";

export const GOLD_COIN_IMAGE_URL = "/game/story-point.webp";
export const GOLD_COIN_TOOLTIP = "Story points";

interface GoldCoinIconProps {
    size?: number;
    tooltip?: string | false;
}

export const GoldCoinIcon = ({ size = 24, tooltip = GOLD_COIN_TOOLTIP }: GoldCoinIconProps) => {
    const image = (
        <span className="inline-flex shrink-0 leading-none">
            <Image
                src={GOLD_COIN_IMAGE_URL}
                alt=""
                w={size}
                h={size}
                fit="contain"
                draggable={false}
            />
        </span>
    );

    if (tooltip === false) return image;

    return (
        <Tooltip label={tooltip} withArrow>
            {image}
        </Tooltip>
    );
};

interface GoldCoinAmountProps {
    amount: number;
    prefix?: string;
    showLabel?: boolean;
    iconSize?: number;
    textProps?: TextProps;
}

export const GoldCoinAmount = ({
    amount,
    prefix = "",
    showLabel = true,
    iconSize = 24,
    textProps,
}: GoldCoinAmountProps) => (
    <Group gap={6} wrap="nowrap">
        <GoldCoinIcon size={iconSize} />
        <Text size="sm" {...textProps}>
            {prefix}
            {amount}
            {showLabel ? " story points" : ""}
        </Text>
    </Group>
);
