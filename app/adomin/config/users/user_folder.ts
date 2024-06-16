import { createFolderViewConfig } from '#adomin/create_folder_view_config'
import { DECK_CARD_VIEW } from './deck_card_view.js'
import { DECK_VIEW } from './deck_view.js'
import { USER_VIEW } from './user_view.js'

export const USER_FOLDER = createFolderViewConfig({
  label: 'Utilisateurs',
  icon: 'users',
  name: 'users',
  views: [USER_VIEW, DECK_VIEW, DECK_CARD_VIEW],
})
