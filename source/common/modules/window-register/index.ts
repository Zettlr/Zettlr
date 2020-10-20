import registerMenubar from './register-menu-bar'
import registerWindowControls from './register-window-controls'
import registerGlobals from './register-globals'
import loadI18nRenderer from '../../lang/load-i18n-renderer'
import registerThemes from './register-themes'

/**
 * This function is the renderer's counterpart to the main process's window
 * configuration and registers stuff like custom window controls and the menu
 * bar (on Windows and Linux, if native is off)
 */
export default function windowRegister (): void {
  // First of all, add the correct class to the body element. This ensures
  // certain styling, for instance a minimal top-bar for Windows and Linux non-
  // native styles.
  document.body.classList.add(process.platform)

  // Load the translation strings
  loadI18nRenderer()

  // Register globals (such as global.config, etc.)
  registerGlobals()
  // Then, we also need to listen to clicks onto the window controls
  registerWindowControls()
  // ... register the menu bar ...
  registerMenubar()
  // ... the theming functionality
  registerThemes()
}
