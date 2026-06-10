import type { AdominConfig } from "#adomin/adomin_config.types";
import { CARD_SET_VIEW } from "./card_set_view.js";
import { CARD_VIEW } from "./card_view.js";
import { USER_FOLDER } from "./users/user_folder.js";

export const ADOMIN_CONFIG: AdominConfig = {
    title: "Galaguerre",
    views: [CARD_SET_VIEW, CARD_VIEW, USER_FOLDER],
};
