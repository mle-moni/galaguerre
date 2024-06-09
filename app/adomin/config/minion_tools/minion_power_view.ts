import { createModelViewConfig } from '#adomin/create_model_view_config'
import MinionPower from '#models/minion_power'

export const MINION_POWER_VIEW = createModelViewConfig(() => MinionPower, {
  columns: {
    hasTaunt: {
      type: 'boolean',
      label: 'Provocation',
    },
    hasCharge: {
      type: 'boolean',
      label: 'Charge',
    },
    hasWindfury: {
      type: 'boolean',
      label: 'Furie des vents',
    },
    isPoisonous: {
      type: 'boolean',
      label: 'Toxique',
    },
    internalLabel: {
      type: 'string',
      label: 'Nom interne',
      creatable: false,
      editable: false,
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
  label: 'Pouvoirs',
  icon: 'sparkles',
})
