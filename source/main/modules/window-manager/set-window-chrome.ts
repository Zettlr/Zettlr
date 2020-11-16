/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        setWindowChrome function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Modifies a BrowserWindowConstructorOptions object to match
 *                  the target appearance (on the main process side of things).
 *
 * END HEADER
 */

import {
  BrowserWindowConstructorOptions
} from 'electron'
import path from 'path'

/**
 * This function modifies the provided window configuration in-place to match
 * the user preferences with regard to BrowserWindow chrome (native or
 * non-native), respecting the current platform.
 *
 * @param   {BrowserWindowConstructorOptions}  winConf  The configuration
 */
export default function setWindowChrome (winConf: BrowserWindowConstructorOptions): void {
  const shouldUseNativeAppearance: boolean = global.config.get('window.nativeAppearance')

  // If the user wants to use native appearance, this means to use a frameless
  // window with the traffic lights slightly inset for macOS.
  if (process.platform === 'darwin' && shouldUseNativeAppearance) {
    winConf.titleBarStyle = 'hiddenInset'
  } else if (process.platform === 'darwin' && !shouldUseNativeAppearance) {
    // Now we're simply creating a frameless window without everything.
    winConf.frame = false
  }

  // If the user wants to use non-native appearance on non-macOS platforms,
  // this means we need a frameless window (so that the renderer instead can
  // display the menu and window controls).
  if (process.platform !== 'darwin' && !shouldUseNativeAppearance) {
    winConf.frame = false
  } // Else: Leave title- and menu-bar in place.

  // Application icon for Linux. Cannot not be embedded in the executable.
  if (process.platform === 'linux') {
    // TODO
    winConf.icon = path.join(__dirname, 'assets/icons/128x128.png')
  }
}
