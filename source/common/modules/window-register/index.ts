import registerToolbar, { ToolbarControl } from './register-toolbar'
import registerGlobals from './register-globals'
import registerThemes from './register-themes'
import registerDefaultContextMenu from './register-default-context'
import loadIcons from './load-icons'

export interface RegistrationOptions {
  showMenubar?: boolean
  showWindowControls?: boolean
  toolbarControls?: ToolbarControl[]
}

// Provide the registerToolbar function to programmatically update it afterwards
export { registerToolbar }

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

  // Load the clarity icons
  loadIcons().catch(e => { console.error(e) })

  // Determine if this code should handle the toolbar (default: no).
  // The default is set to give this code backward compatibility (only
  // touch the toolbar where we explicitly set this)
  let shouldHandleToolbar: boolean = false
  if (options !== undefined) {
    if (options.toolbarControls !== undefined) {
      shouldHandleToolbar = true // Existence of toolbarControls implies a toolbar
    }
  }

  // Register globals (such as global.config, etc.)
  registerGlobals()
  // ... the toolbar ...
  if (shouldHandleToolbar && options?.toolbarControls !== undefined) {
    registerToolbar(options.toolbarControls)
  }
  // ... the theming functionality ...
  registerThemes()
  // ... the default context menus
  registerDefaultContextMenu()
}
