import router from '@adonisjs/core/services/router'
import { dbmlSvgRoute } from './dbml_svg_route.js'
import { dbmlView } from './dbml_view.js'

router
  .group(() => {
    router.get('/models', dbmlView)
    router.get('/models.svg', dbmlSvgRoute)
  })
  .prefix('dbml')
