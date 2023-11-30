/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Error window entry file
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Main entry point for the paste images modal
 *
 * END HEADER
 */

import { createApp } from 'vue'
import App from './App.vue'
import windowRegister from '@common/modules/window-register'

// The first thing we have to do is run the window controller
windowRegister()
  .then(() => {
    const app = createApp(App)
    app.mount('#app')
  })
  .catch(e => console.error(e))
