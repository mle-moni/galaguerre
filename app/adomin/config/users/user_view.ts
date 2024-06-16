import { createModelViewConfig } from '#adomin/create_model_view_config'
import User from '#models/user'

export const USER_VIEW = createModelViewConfig(() => User, {
  columns: {
    pseudo: {
      type: 'string',
      label: 'Pseudo',
    },
    email: {
      type: 'string',
      label: 'Email',
    },
    isSuperAdmin: {
      type: 'boolean',
      label: 'Super Admin',
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
  label: 'Utilisateur',
  icon: 'user',
})
