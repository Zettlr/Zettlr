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

export type MenuShortcutName = 'previous-tab'|'next-tab'

/**
 * Default keybindings for all commands. May be empty (in which case there is no
 * default shortcut assigned.)
 */
export const defaultKeybindings: Record<MenuShortcutName, DefaultShortcut> = {
  'previous-tab': { key: 'Ctrl-Shift-Tab' },
  'next-tab': { key: 'Ctrl-Tab' }
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
