import { createFolderViewConfig } from "#adomin/create_folder_view_config";
import { ACTION_VIEW } from "./action_view.js";
import { BOOST_VIEW } from "./boost_view.js";
import { CARD_FILTER_TAG_VIEW } from "./card_filter_tag_view.js";
import { CARD_FILTER_VIEW } from "./card_filter_view.js";
import { CARD_TAG_VIEW } from "./card_tag_view.js";
import { COMPARISON_VIEW } from "./comparison_view.js";
import { PASSIVE_VIEW } from "./passive_view.js";
import { TAG_VIEW } from "./tag_view.js";
import { TARGET_VIEW } from "./target_view.js";
import { TOOL_TO_TARGET_VIEW } from "./tool_to_target_view.js";

export const TOOLS_FOLDER = createFolderViewConfig({
    label: "Outils",
    icon: "folder",
    name: "tools",
    views: [
        CARD_TAG_VIEW,
        ACTION_VIEW,
        CARD_FILTER_VIEW,
        CARD_FILTER_TAG_VIEW,
        COMPARISON_VIEW,
        PASSIVE_VIEW,
        BOOST_VIEW,
        TARGET_VIEW,
        TOOL_TO_TARGET_VIEW,
        TAG_VIEW,
    ],
});
