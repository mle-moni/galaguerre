import { useSearchParams } from "react-router-dom";
import { useIsMobilePortrait } from "./use_is_mobile_portrait";

export type BoardMinionVariant = "oval" | "rect";

export const useBoardMinionVariant = (): BoardMinionVariant => {
    const [searchParams] = useSearchParams();
    const isMobilePortrait = useIsMobilePortrait();
    const param = searchParams.get("boardMinion");

    if (param === "rect" || param === "oval") {
        return param;
    }

    return isMobilePortrait ? "oval" : "rect";
};
