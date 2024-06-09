import { createModelViewConfig } from '#adomin/create_model_view_config'
import Spell from '#models/spell'

export const SPELL_VIEW = createModelViewConfig(() => Spell, {
  columns: {
    internalLabel: {
      type: 'string',
      label: 'Nom interne',
    },
    action: {
      type: 'belongsToRelation',
      labelFields: ['internalLabel'],
      modelName: 'Action',
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
  label: 'Sort',
  icon: 'wand',
})
