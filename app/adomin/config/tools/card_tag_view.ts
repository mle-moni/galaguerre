import { createModelViewConfig } from '#adomin/create_model_view_config'
import CardTag from '#models/card_tag'

export const CARD_TAG_VIEW = createModelViewConfig(() => CardTag, {
  columns: {
    card: {
      type: 'belongsToRelation',
      modelName: 'Card',
      labelFields: ['label'],
      label: 'Carte',
    },
    tag: {
      type: 'belongsToRelation',
      modelName: 'Tag',
      labelFields: ['label'],
      label: 'Tag',
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
  label: 'Tag de carte',
  icon: 'tag',
})
