/**
 * Takes a CodeMirror style shortcut and transforms it to conform to Electron
 * accelerator syntax. Example: `Mod-Shift-c` -> `CmdOrCtrl+Shift+C`.
 *
 * Two NOTEs:
 * 
 * 1. Also accepts undefined, and returns that if applicable, for easy pass-
 * through.
 * 2. The empty string is considered undefined.
 * 
 *
 * @param   {string}  cmShortcut  The CM shortcut
 *
 * @return  {string}              The Electron shortcut.
 */
export function cmShortcutToElectron (cmShortcut?: string): string|undefined {
  if (cmShortcut === undefined || cmShortcut.trim() === '') {
    return undefined
  }

  const keys = cmShortcut.trim().split('-')

  const outputKeys: string[] = []

  for (const key of keys) {
    switch (key) {
      case 'Mod':
        outputKeys.push('CmdOrCtrl')
        break
      case 'Ctrl':
        outputKeys.push('Ctrl')
        break
      case 'Alt':
        outputKeys.push('Alt')
        break
      case 'Shift':
        outputKeys.push('Shift')
        break
      case 'ArrowRight':
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'ArrowDown':
        outputKeys.push(key.slice(5))
        break
      default:
        // NOTE: Electron wants keys in uppercase format, not lowercase as
        // CodeMirror.
        outputKeys.push(key.toUpperCase())
    }
  }

  return outputKeys.join('+')
}
