/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        WindowRegistration module
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module exports the windowRegister function which must
 *                  be run by every renderer process before anything else. It
 *                  will register certain globals, the necessary stylesheets and
 *                  other important assets.
 *
 * END HEADER
 */

import registerThemes from './register-themes'
import registerDefaultContextMenu from './register-default-context'
import loadIcons from './load-icons'
import { loadData } from '@common/i18n-renderer'

/**
 * This function is the renderer's counterpart to the main process's window
 * configuration and registers stuff like custom window controls and the menu
 * bar (on Windows and Linux, if native is off)
 */
export default async function windowRegister (): Promise<void> {
  // Immediately load the translations
  await loadData()
  // Load the clarity icons
  await loadIcons()

  // ... the theming functionality ...
  registerThemes()
  // ... the default context menus
  registerDefaultContextMenu()
}
