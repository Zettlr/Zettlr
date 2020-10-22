import registerMenubar from './register-menu-bar'
import registerWindowControls from './register-window-controls'
import registerGlobals from './register-globals'
import loadI18nRenderer from '../../lang/load-i18n-renderer'
import registerThemes from './register-themes'
import registerDefaultContextMenu from './register-default-context'

export interface RegistrationOptions {
  showMenubar?: boolean
  showWindowControls?: boolean
}

/**
 * This function is the renderer's counterpart to the main process's window
 * configuration and registers stuff like custom window controls and the menu
 * bar (on Windows and Linux, if native is off)
 */
export default function windowRegister (options?: RegistrationOptions): void {
  // First of all, add the correct class to the body element. This ensures
  // certain styling, for instance a minimal top-bar for Windows and Linux non-
  // native styles.
  document.body.classList.add(process.platform)

  // Determine if the menubar should be shown (default: yes)
  let shouldShowMenubar: boolean = true
  if (options !== undefined) {
    if (options.showMenubar !== undefined) {
      shouldShowMenubar = options.showMenubar
    }
  }

  // Determine if the window controls should be shown (default: yes)
  let shouldShowWindowControls: boolean = true
  if (options !== undefined) {
    if (options.showWindowControls !== undefined) {
      shouldShowWindowControls = options.showWindowControls
    }
  }

  // Load the translation strings
  loadI18nRenderer()

  // Register globals (such as global.config, etc.)
  registerGlobals()
  // Then, we also need to listen to clicks onto the window controls
  registerWindowControls(shouldShowWindowControls)
  // ... register the menu bar ...
  registerMenubar(shouldShowMenubar)
  // ... the theming functionality ...
  registerThemes()
  // ... the default context menus
  registerDefaultContextMenu()
}
