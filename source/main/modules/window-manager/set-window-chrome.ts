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

  // On macOS, we want the traffic lights slightly inset and no native window
  // chrome.
  if (process.platform === 'darwin') {
    winConf.titleBarStyle = 'hiddenInset'
  } else if (process.platform !== 'linux' || !shouldUseNativeAppearance) {
    // On Windows, we need a frameless window. On Linux, only if the
    // shouldUseNativeAppearance flag is set to false.
    winConf.frame = false
  } // Else: We have Linux with native appearance.

  // Application icon for Linux. Cannot not be embedded in the executable.
  if (process.platform === 'linux') {
    // TODO
    winConf.icon = path.join(__dirname, 'assets/icons/128x128.png')
  }
}
