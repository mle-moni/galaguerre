import { isCardTagImageSymbol } from "#api_types/card.types";
import { Image } from "@mantine/core";

interface CardTagSymbolProps {
    symbol: string;
    size?: number;
    className?: string;
}

export const CardTagSymbol = ({ symbol, size, className }: CardTagSymbolProps) => {
    if (isCardTagImageSymbol(symbol)) {
        return (
            <Image
                src={symbol}
                alt=""
                w={size}
                h={size}
                fit="contain"
                draggable={false}
                className={className ?? "card-tag-symbol-image"}
            />
        );
    }

    return <span className={className}>{symbol}</span>;
};
