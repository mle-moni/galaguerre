import { AdominConfig } from '#adomin/adomin_config.types'
import { CARD_VIEW } from './card_view.js'
import { MINION_FOLDER } from './minion/minion_folder.js'
import { MINION_VIEW } from './minion/minion_view.js'
import { SPELL_VIEW } from './spell_view.js'
import { TOOLS_FOLDER } from './tools/tools_folder.js'
import { WEAPON_VIEW } from './weapon_view.js'

/**
 * This file will contain your Adomin Config
 * For each view you want to have in you backoffice, you will need to add your views config in the "views" array,
 * with the following syntax:
 *
 * ```ts
 * const YOUR_MODEL_CONFIG = createModelViewConfig(() => YourModel, {})
 * export const ADOMIN_CONFIG: AdominConfig = {
 *  title: 'Your backoffice title',
 *  views: [YOUR_MODEL_CONFIG],
 * }
```
 *
 * if you want to add a stat view use `createStatsViewConfig` instead of `createModelViewConfig`
 */

export const ADOMIN_CONFIG: AdominConfig = {
  title: 'Galaguerre',
  views: [CARD_VIEW, SPELL_VIEW, WEAPON_VIEW, MINION_VIEW, MINION_FOLDER, TOOLS_FOLDER],
}
