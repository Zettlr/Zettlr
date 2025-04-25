/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror default key bindings
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the default key bindings for the editor,
 *                  alongside a few utilities that help accessing this.
 *
 * END HEADER
 */

/**
 * A ShortcutBinding conforms essentially to the same API as the CodeMirror
 * keybindings, sans the actual `run` properties.
 */
interface ShortcutBinding {
  key?: string
  mac?: string
  linux?: string
  win?: string
}

/**
 * These are the editor commands that can be remapped
 */
interface EditorCommandMap {
  insertImage: ShortcutBinding
  addFootnote: ShortcutBinding
}

/**
 * These are the default key bindings (which were previously stored in the
 * actual key map)
 */
const defaultMap: EditorCommandMap = {
  insertImage: { key: 'Mod-Alt-i', mac: 'Mod-Shift-i' },
  addFootnote: { key: 'Mod-Alt-f', mac: 'Mod-Alt-r' }
} as const

/**
 * Allows typing correlated types with the proper available commands.
 */
export type EditorKeyboardCommand = keyof EditorCommandMap

/**
 * Returns the platform-specific shortcut defined for the provided command,
 * based on the runtime-determined platform (via `process.platform`). Returns
 * undefined if the command has no keyboard binding for this platform defined.
 *
 * @param   {keyof typeof defaultMap}  command  The command to return the keybinding for
 *
 * @return  {string}                            The keybinding.
 *
 * @throws When a keyboard shortcut does not define a generic `key` property or
 * the platform does not have a specific keybinding.
 */
export function getPlatformSpecificDefaultKeybinding (command: EditorKeyboardCommand): string {
  const cmd = defaultMap[command]
  
  if (process.platform === 'darwin' && cmd.mac !== undefined) {
    return cmd.mac
  } else if (process.platform === 'win32' && cmd.win !== undefined) {
    return cmd.win
  } else if (process.platform === 'linux' && cmd.linux !== undefined) {
    return cmd.linux
  } else if (cmd.key !== undefined) {
    return cmd.key
  } else {
    throw new Error(`Missing keyboard shortcut for command ${command} on platform ${process.platform}`)
  }
}
