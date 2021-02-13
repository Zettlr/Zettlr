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

import Vue from 'vue'
import Error from './Error.vue'
import windowRegister from '../common/modules/window-register'

// The first thing we have to do is run the window controller
windowRegister()

// Create the Vue app because we need to reference it in our toolbar controls
const app = new Vue(Error)

// In the end: mount the app onto the DOM
app.$mount('#app')
