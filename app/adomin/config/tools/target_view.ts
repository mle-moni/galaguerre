import { createModelViewConfig } from '#adomin/create_model_view_config'
import Target from '#models/target'
import { GALAGUERRE_TARGET_TYPES_OPTIONS } from '../../../galaguerre/galaguerre.types.js'

export const TARGET_VIEW = createModelViewConfig(() => Target, {
  columns: {
    type: {
      type: 'enum',
      options: GALAGUERRE_TARGET_TYPES_OPTIONS,
      label: 'Type',
    },
    comparison: {
      type: 'belongsToRelation',
      labelFields: ['internalLabel'],
      modelName: 'Comparison',
      label: 'Comparaison',
      nullable: true,
    },
    action: {
      type: 'belongsToRelation',
      labelFields: ['internalLabel'],
      modelName: 'Action',
      label: 'Action',
      nullable: true,
    },
    boost: {
      type: 'belongsToRelation',
      labelFields: ['internalLabel'],
      modelName: 'Boost',
      label: 'Boost',
      nullable: true,
    },
    // TODO finish up
  },
  label: 'Cible',
  icon: 'viewfinder',
})
