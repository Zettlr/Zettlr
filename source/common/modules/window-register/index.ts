import registerGlobals from './register-globals'
import registerThemes from './register-themes'
import registerDefaultContextMenu from './register-default-context'
import loadIcons from './load-icons'

/**
 * This function is the renderer's counterpart to the main process's window
 * configuration and registers stuff like custom window controls and the menu
 * bar (on Windows and Linux, if native is off)
 */
export default function windowRegister (): void {
  // Load the clarity icons
  loadIcons().catch(e => { console.error(e) })

  // Register globals (such as global.config, etc.)
  registerGlobals()
  // ... the theming functionality ...
  registerThemes()
  // ... the default context menus
  registerDefaultContextMenu()
}
