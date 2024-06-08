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
  label: 'Minion',
  icon: 'cat',
})
