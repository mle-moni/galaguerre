import { createModelViewConfig } from '#adomin/create_model_view_config'
import Action from '#models/action'
import { GALAGUERRE_ACTIONS_TYPES_OPTIONS } from '../../../galaguerre/galaguerre.types.js'

export const ACTION_VIEW = createModelViewConfig(() => Action, {
  columns: {
    type: {
      type: 'enum',
      options: GALAGUERRE_ACTIONS_TYPES_OPTIONS,
      label: 'Type',
    },
    isTargeted: {
      type: 'boolean',
      label: 'Ciblé',
    },
    damage: {
      type: 'number',
      label: 'Dégâts',
      nullable: true,
    },
    heal: {
      type: 'number',
      label: 'Soins',
      nullable: true,
    },
    drawCount: {
      type: 'number',
      label: 'Pioche',
      nullable: true,
    },
    enemyDrawCount: {
      type: 'number',
      label: 'Pioche adverse',
      nullable: true,
    },
    drawCardFilter: {
      type: 'belongsToRelation',
      modelName: 'CardFilter',
      labelFields: ['internalLabel'],
      label: 'Filtre de pioche',
      nullable: true,
    },
    enemyDrawCardFilter: {
      type: 'belongsToRelation',
      modelName: 'CardFilter',
      labelFields: ['internalLabel'],
      label: 'Filtre de pioche adverse',
      nullable: true,
    },
  },
  label: 'Action',
  icon: 'bolt',
  queryBuilderCallback: (q) =>
    q
      .preload('drawCardFilter', (q2) => q2.preload('comparison'))
      .preload('enemyDrawCardFilter', (q2) => q2.preload('comparison')),
})
