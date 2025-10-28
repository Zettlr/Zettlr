import { systemPreferences } from 'electron'

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
  * @return  {{ accent: string, contrast: string }}  The system colors.
  */
export function getSystemColors (): { accent: string, contrast: string } {
  const colorFallback = {
    accent: '1cb27eff', // Fully opaque Zettlr green
    contrast: 'ffffffff' // White as a contrast
  }
  const darkContrast = '333333ff'
  const lightContrast = 'ffffffff'

  if ([ 'darwin', 'win32' ].includes(process.platform)) {
    try {
      // This method may fail because it is only available on macOS >=10.14
      const accentColor = systemPreferences.getAccentColor()
      // Electron is unspecific about what "available" means so we listen
      // for errors and check the return value
      if (typeof accentColor !== 'string') {
        return colorFallback
      } else {
        // Calculate the contrast before returning
        const r = parseInt(accentColor.substring(0, 2), 16) // hexToR
        const g = parseInt(accentColor.substring(2, 4), 16) // hexToG
        const b = parseInt(accentColor.substring(4, 6), 16) // hexToB
        const ratio = (r * 0.299) + (g * 0.587) + (b * 0.114)
        const threshold = 186 // NOTE: We can adapt this later on
        return {
          accent: accentColor,
          contrast: (ratio > threshold) ? darkContrast : lightContrast
        }
      }
    } catch (err) {
      return colorFallback // Probably macOS < 10.14
    }
  } else {
    return colorFallback // Unsupported platform
  }
}
