import { createFolderViewConfig } from '#adomin/create_folder_view_config'
import { ACTION_VIEW } from './action_view.js'
import { BOOST_VIEW } from './boost_view.js'
import { CARD_FILTER_VIEW } from './card_filter_view.js'
import { COMPARISON_VIEW } from './comparison_view.js'
import { PASSIVE_VIEW } from './passive_view.js'
import { TARGET_VIEW } from './target_view.js'

export const TOOLS_FOLDER = createFolderViewConfig({
  label: 'Outils',
  icon: 'folder',
  name: 'tools',
  views: [ACTION_VIEW, CARD_FILTER_VIEW, COMPARISON_VIEW, PASSIVE_VIEW, BOOST_VIEW, TARGET_VIEW],
})
