import { Group, Image, Text, type TextProps } from "@mantine/core";

export const PACK_IMAGE_URL = "/game/paquet.webp";
const PACK_HEIGHT_RATIO = 7 / 5;

interface PackIconProps {
    width?: number;
}

export const PackIcon = ({ width = 28 }: PackIconProps) => (
    <span className="inline-flex shrink-0 leading-none">
        <Image
            src={PACK_IMAGE_URL}
            alt=""
            w={width}
            h={Math.round(width * PACK_HEIGHT_RATIO)}
            fit="contain"
            draggable={false}
        />
    </span>
);

interface PackAmountProps {
    amount: number;
    prefix?: string;
    showLabel?: boolean;
    iconWidth?: number;
    textProps?: TextProps;
}

export const PackAmount = ({
    amount,
    prefix = "",
    showLabel = true,
    iconWidth = 20,
    textProps,
}: PackAmountProps) => (
    <Group gap={6} wrap="nowrap">
        <PackIcon width={iconWidth} />
        <Text size="sm" {...textProps}>
            {prefix}
            {amount}
            {showLabel ? ` Paquet${amount > 1 ? "s" : ""}` : ""}
        </Text>
    </Group>
);
