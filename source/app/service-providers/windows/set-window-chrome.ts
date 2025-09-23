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

import type ConfigProvider from '@providers/config'
import { type BrowserWindowConstructorOptions, nativeTheme } from 'electron'
import path from 'path'

/**
 * This function modifies the provided window configuration in-place to match
 * the user preferences with regard to BrowserWindow chrome (native or
 * non-native), respecting the current platform.
 *
 * @param  {BrowserWindowConstructorOptions}  winConf        The configuration
 * @param  {boolean}                          [modal=false]  If set to true, will assign a modal chrome
 */
export default function setWindowChrome (config: ConfigProvider, winConf: BrowserWindowConstructorOptions, modal: boolean = false): void {
  const shouldUseNativeAppearance = config.get().window.nativeAppearance
  const shouldUseVibrancy = config.get().window.vibrancy

  if (process.platform !== 'darwin' || modal) {
    // It is recommended to set a background color for the windows, however, on
    // macOS we can't do so because that would render nil the vibrancy.
    winConf.backgroundColor = config.get().darkMode ? '#000' : '#fff'
  }

  if (process.platform === 'darwin' && !modal) {
    // On macOS, we want slightly inset traffic lights without any other window
    // chrome. Additionally, we'll be setting the window's vibrancy so that the
    // app looks even more native.
    winConf.titleBarStyle = 'hiddenInset'
    if (shouldUseVibrancy && !nativeTheme.prefersReducedTransparency) {
      // See https://developer.apple.com/design/human-interface-guidelines/macos/visual-design/translucency/
      winConf.vibrancy = 'under-window'
      winConf.visualEffectState = 'followWindow'
      winConf.transparent = true
    }
  } else if ((process.platform === 'linux' && !shouldUseNativeAppearance) || process.platform === 'win32') {
    // On Windows, we need a frameless window. On Linux, only if the
    // shouldUseNativeAppearance flag is set to false.
    winConf.frame = false
  } // Else: We have Linux with native appearance.

  // Application icon for Linux. Cannot be embedded in the executable.
  if (process.platform === 'linux') {
    winConf.icon = path.join(__dirname, 'assets/icons/png/128x128.png')
  }
}
