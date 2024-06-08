import { createModelViewConfig } from '#adomin/create_model_view_config'
import Card from '#models/card'
import {
  GALAGUERRE_CARD_MODES_OPTIONS,
  GALAGUERRE_CARD_TYPES_OPTIONS,
} from '../../galaguerre/galaguerre.types.js'
import { createFile, deleteFile } from '../../utils/files.js'

export const CARD_VIEW = createModelViewConfig(() => Card, {
  columns: {
    type: {
      type: 'enum',
      options: GALAGUERRE_CARD_TYPES_OPTIONS,
      label: 'Type',
    },
    minion: {
      type: 'belongsToRelation',
      modelName: 'Minion',
      labelFields: ['internalLabel', 'attack', 'health'],
      nullable: true,
    },
    cost: {
      type: 'number',
      label: 'Coût',
    },
    label: {
      type: 'string',
      label: 'Nom',
    },
    imageUrl: {
      type: 'file',
      subType: 'url',
      isImage: true,
      createFile,
      deleteFile,
      label: 'Image',
    },
    cardMode: {
      type: 'enum',
      options: GALAGUERRE_CARD_MODES_OPTIONS,
      label: 'Mode',
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
  label: 'Carte',
  icon: 'cards',
})
