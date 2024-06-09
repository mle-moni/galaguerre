import { createFolderViewConfig } from '#adomin/create_folder_view_config'
import { MINION_VIEW } from './minion_view.js'

export const MINION_FOLDER = createFolderViewConfig({
  label: 'Monstres',
  icon: 'folder',
  name: 'minions',
  views: [MINION_VIEW],
})
