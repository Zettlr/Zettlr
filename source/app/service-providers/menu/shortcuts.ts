/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Utility functions to retrieve custom shortcuts for the menu
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Helps with implementing custom UI shortcuts.
 *
 * END HEADER
 */

import { getDefaultKeybinding, type DefaultShortcut } from 'source/common/util/shortcuts'
import { type ConfigOptions } from '../config/get-config-template'

/**
 * INSTRUCTIONS FOR MAKING A NEW CUSTOMIZABLE MENU SHORTCUT
 *
 * 1. Think of a descriptive name that only contains ASCII letters and hyphens.
 * 2. Add this name to the MenuShortcutName type and defaultKeybindings below.
 * 3. Add it to the corresponding section in the config provider.
 * 4. Make the menu use the custom shortcut (see existing examples).
 * 5. Add it to a section in the preferences.
 */

export type MenuShortcutName = 'previous-tab'|'next-tab'|'filter-files'

/**
 * Default keybindings for all commands. May be empty (in which case there is no
 * default shortcut assigned.)
 */
export const defaultKeybindings: Record<MenuShortcutName, DefaultShortcut> = {
  'previous-tab': { key: 'Ctrl-Shift-Tab' },
  'next-tab': { key: 'Ctrl-Tab' },
  'filter-files': { key: 'Mod-Shift-t' }
}

/**
 * Retrieves a custom shortcut based on the shortcut name, the available map of
 * existing custom shortcuts, and an optional default key. This function returns
 * undefined as a fallback, in which case the accelerator will not be set.
 *
 * @param   {ShortcutName}                name  The shortcut in question
 * @param   {ConfigOptions.shortcuts.ui}  map   The map of available custom shortcuts
 *
 * @return  {string}                        Either a shortcut, or undefined.
 */
export function getCustomShortcut (name: MenuShortcutName, map: ConfigOptions['shortcuts']['ui']): string|undefined {
  const candidate = map[name]
  if (candidate === undefined || candidate.trim() === '') {
    return getDefaultKeybinding(name, defaultKeybindings)
  } else {
    return candidate
  }
}
