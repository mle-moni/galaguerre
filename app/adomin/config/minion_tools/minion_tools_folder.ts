import { createFolderViewConfig } from '#adomin/create_folder_view_config'
import { MINION_PASSIVE_VIEW } from './minion_passive_view.js'
import { MINION_POWER_VIEW } from './minion_power_view.js'

export const MINION_FOLDER = createFolderViewConfig({
  label: 'Outils Monstres',
  icon: 'folder',
  name: 'minions-tools',
  views: [MINION_POWER_VIEW, MINION_PASSIVE_VIEW],
})
