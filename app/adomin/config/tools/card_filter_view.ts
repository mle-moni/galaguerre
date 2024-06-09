import { createModelViewConfig } from '#adomin/create_model_view_config'
import CardFilter from '#models/card_filter'
import { GALAGUERRE_CARD_TYPES_OPTIONS } from '../../../galaguerre/galaguerre.types.js'

export const CARD_FILTER_VIEW = createModelViewConfig(() => CardFilter, {
  columns: {
    type: {
      type: 'enum',
      options: GALAGUERRE_CARD_TYPES_OPTIONS,
      label: 'Type',
    },
    comparison: {
      type: 'belongsToRelation',
      labelFields: ['internalLabel'],
      modelName: 'Comparison',
      label: 'Comparaison',
    },
  },
  label: 'Filtre de carte',
  icon: 'filter',
})
