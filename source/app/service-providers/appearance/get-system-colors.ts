import { systemPreferences } from 'electron'
import { retrieveAccentColorFromDBus } from './dbus'

/**
 * Defines a SystemColour interface as is being returned by the appearance provider
 */
export interface SystemColor {
  accent: string
  contrast: string
}

/**
 * Takes a color in hexadecimal format `rrggbb` and returns a contrast color
 * suitable for that particular color, in the format `rrggbbaa`.
 *
 * @param   {string}  color  The color to check
 *
 * @return  {string}         The appropriate contrast color.
 */
function getContrastForColor (color: string): string {
  const darkContrast = '333333ff'
  const lightContrast = 'ffffffff'
  const threshold = 186 // NOTE: Empirical number, can be adjusted.

  const r = parseInt(color.substring(0, 2), 16) // hexToR
  const g = parseInt(color.substring(2, 4), 16) // hexToG
  const b = parseInt(color.substring(4, 6), 16) // hexToB
  const ratio = (r * 0.299) + (g * 0.587) + (b * 0.114)

  return ratio > threshold ? darkContrast : lightContrast
}

/**
  * Returns the current system colors. The return value depends on the
  * platform. On Linux and macOS < 10.14, this will always return the Zettlr
  * green with a white contrast. On Windows and macOS >= 10.14, this will
  * return the current accent color reported by the OS and a contrast color
  * that is calculated based on a formula either light or dark.
  * 
  * NOTEs:
  *
  * * Main process only, this function requires a main module.
  * * This function returns hexadecimal colors without the leading `#`.
  *
  * @return  {SystemColor}  The system colors.
  */
export async function getSystemColors (): Promise<SystemColor> {
  const colorFallback = {
    accent: '1cb27eff', // Fully opaque Zettlr green
    contrast: 'ffffffff' // White as a contrast
  }
  

  if ([ 'darwin', 'win32' ].includes(process.platform)) {
    // Electron supports getting the accent color on Windows and macOS natively.
    try {
      // This method may fail because it is only available on macOS >=10.14
      const accent = systemPreferences.getAccentColor()
      // Electron is unspecific about what "available" means so we listen
      // for errors and check the return value
      if (typeof accent !== 'string') {
        return colorFallback
      } else {
        return { accent, contrast: getContrastForColor(accent) }
      }
    } catch (err) {
      return colorFallback // Probably macOS < 10.14
    }
  } else if (process.platform === 'linux') {
    // On Linux, many desktop environments use dbus.
    try {
      const accent = await retrieveAccentColorFromDBus()
      return { accent, contrast: getContrastForColor(accent) }
    } catch (err: unknown) {
      // There seems to be no dbus support on this system.
      return colorFallback
    }
  } else {
    return colorFallback // Unsupported platform
  }
}
