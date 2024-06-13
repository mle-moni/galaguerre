import { createFolderViewConfig } from '#adomin/create_folder_view_config'
import { MINION_BATTLECRY_ACTION_VIEW } from './minion_battlecry_action_view.js'
import { MINION_DEATHRATTLE_ACTION_VIEW } from './minion_deathrattle_action_view.js'
import { MINION_PASSIVE_VIEW } from './minion_passive_view.js'
import { MINION_POWER_VIEW } from './minion_power_view.js'

export const MINION_FOLDER = createFolderViewConfig({
  label: 'Outils Monstres',
  icon: 'folder',
  name: 'minions-tools',
  views: [
    MINION_POWER_VIEW,
    MINION_PASSIVE_VIEW,
    MINION_BATTLECRY_ACTION_VIEW,
    MINION_DEATHRATTLE_ACTION_VIEW,
  ],
})
