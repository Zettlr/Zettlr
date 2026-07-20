/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Shortcuts utilities
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a bunch of utility functions and types to
 *                  facilitate custom shortcut implementation in both main
 *                  process and renderer.
 *
 * END HEADER
 */

/**
 * Interface that mimicks the configurability of CodeMirror's commands. Can be
 * used in both main process and renderer process to define default shortcuts
 * which can be overridden.
 */
export interface DefaultShortcut {
  mac?: string
  win?: string
  linux?: string
  key?: string
}

/**
 * Returns the assigned default keyboard shortcut for the provided action. NOTE
 * that these default keybindings can be custom per platform. The function
 * checks the platform for that.
 *
 * @param   {keyof T}  name  The name of the shortcut
 * @param   {T}        defaults The default map
 *
 * @return  {string|undefined}          The (platform-specific) default
 *                                      keybinding, if available.
 */
export function getDefaultKeybinding<T extends Record<string, DefaultShortcut>> (name: keyof T, defaults: T): string|undefined {
  const candidate = defaults[name]

  if (process.platform === 'darwin' && 'mac' in candidate) {
    return candidate.mac
  } else if (process.platform === 'win32' && 'win' in candidate) {
    return candidate.win
  } else if (process.platform === 'linux' && 'linux' in candidate) {
    return candidate.linux
  } else {
    return candidate.key
  }
}

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
