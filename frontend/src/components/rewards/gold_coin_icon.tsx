import { Group, Image, Text, Tooltip, type TextProps } from "@mantine/core";

export const GOLD_COIN_IMAGE_URL = "/game/cofee-beans.webp";
export const GOLD_COIN_TOOLTIP = "Grains de café";

interface GoldCoinIconProps {
    size?: number;
}

export const GoldCoinIcon = ({ size = 24 }: GoldCoinIconProps) => (
    <Tooltip label={GOLD_COIN_TOOLTIP} withArrow>
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
    </Tooltip>
);

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
            {showLabel ? " Grains de café" : ""}
        </Text>
    </Group>
);
