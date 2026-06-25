/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Shortcuts Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the shortcut tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import { getDefaultKeybinding } from '@common/modules/markdown-editor/keymaps/shortcuts'

export function getShortcutFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Editor Shortcuts'),
      infoString: trans('Customize the available editor shortcuts here. ATTENTION: This feature is experimental. We may add or remove shortcuts at any time.'),
      group: PreferencesGroups.Shortcuts,
      help: undefined, // TODO
      fields: [
        {
          type: 'shortcut',
          label: trans('Align Markdown table under cursor'),
          model: 'shortcuts.editor.table-align',
          defaultShortcut: getDefaultKeybinding('table-align')
        },
        {
          type: 'shortcut',
          label: trans('Align table column left'),
          model: 'shortcuts.editor.table-align-col-left',
          defaultShortcut: getDefaultKeybinding('table-align-col-left')
        },
        {
          type: 'shortcut',
          label: trans('Align table column center'),
          model: 'shortcuts.editor.table-align-col-center',
          defaultShortcut: getDefaultKeybinding('table-align-col-center')
        },
        {
          type: 'shortcut',
          label: trans('Align table column right'),
          model: 'shortcuts.editor.table-align-col-right',
          defaultShortcut: getDefaultKeybinding('table-align-col-right')
        }
      ]
    }
  ]
}
