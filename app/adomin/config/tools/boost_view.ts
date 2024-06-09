import { createModelViewConfig } from '#adomin/create_model_view_config'
import Boost from '#models/boost'

export const BOOST_VIEW = createModelViewConfig(() => Boost, {
  columns: {
    health: {
      type: 'number',
      label: 'Vie',
      nullable: true,
    },
    attack: {
      type: 'number',
      label: 'Attaque',
      nullable: true,
    },
    spellPower: {
      type: 'number',
      label: 'Dommage de sort',
      nullable: true,
    },
    minionPower: {
      type: 'belongsToRelation',
      modelName: 'MinionPower',
      labelFields: ['internalLabel'],
      label: 'Pouvoir de monstre',
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
      label: 'Modifié le',
      creatable: false,
      editable: false,
    },
  },
  label: 'Boost',
  icon: 'rocket',
})
