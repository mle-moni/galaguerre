import { createModelViewConfig } from '#adomin/create_model_view_config'
import Comparison from '#models/comparison'
import { GALAGUERRE_COMPARISONS_OPTIONS } from '../../../galaguerre/galaguerre.types.js'

export const COMPARISON_VIEW = createModelViewConfig(() => Comparison, {
  columns: {
    internalLabel: {
      type: 'string',
      label: 'Nom interne',
      computed: true,
    },
    costComparison: {
      type: 'enum',
      options: GALAGUERRE_COMPARISONS_OPTIONS,
      nullable: true,
      label: 'Comparaison de coût',
    },
    cost: {
      type: 'number',
      label: 'Coût',
      nullable: true,
    },
    attackComparison: {
      type: 'enum',
      options: GALAGUERRE_COMPARISONS_OPTIONS,
      nullable: true,
      label: "Comparaison d'attaque",
    },
    attack: {
      type: 'number',
      label: 'Attaque',
      nullable: true,
    },
    healthComparison: {
      type: 'enum',
      options: GALAGUERRE_COMPARISONS_OPTIONS,
      nullable: true,
      label: 'Comparaison de points de vie',
    },
    health: {
      type: 'number',
      label: 'Points de vie',
      nullable: true,
    },
    createdAt: {
      type: 'date',
      subType: 'datetime',
      label: 'Créé le',
      creatable: false,
      editable: false,
    },
    updatedAt: {
      type: 'date',
      subType: 'datetime',
      label: 'Mis à jour le',
      creatable: false,
      editable: false,
    },
  },
  label: 'Comparaison',
  icon: 'scale',
})
