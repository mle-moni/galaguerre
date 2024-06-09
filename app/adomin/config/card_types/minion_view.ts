import { createModelViewConfig } from '#adomin/create_model_view_config'
import Minion from '#models/minion'

export const MINION_VIEW = createModelViewConfig(() => Minion, {
  columns: {
    internalLabel: {
      type: 'string',
      label: 'Nom interne',
    },
    attack: {
      type: 'number',
      label: 'Attaque',
    },
    health: {
      type: 'number',
      label: 'Points de vie',
    },
    minionPower: {
      type: 'belongsToRelation',
      modelName: 'MinionPower',
      labelFields: ['internalLabel'],
      label: 'Pouvoir de monstre',
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
  label: 'Monstre',
  icon: 'cat',
})
