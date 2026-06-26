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
import { getDefaultKeybinding } from '@common/util/shortcuts'
import { defaultKeybindings, type EditorShortcutName } from '@common/modules/markdown-editor/keymaps/shortcuts'

export function getShortcutFields (): PreferencesFieldset[] {
  // For the time being, we'll declare this feature as experimental to ensure we
  // can tweak that accordingly.
  const disclaimer = ' WARNING: EXPERIMENTAL FEATURE. This feature may still change at any time without prior communication.'
  // Utility function to retrieve the default keybindings
  const sc = (name: EditorShortcutName) => {
    return getDefaultKeybinding(name, defaultKeybindings)
  }

  return [
    {
      title: trans('Table Shortcuts'),
      infoString: trans('Customize the available table shortcuts for the editor.') + disclaimer,
      group: PreferencesGroups.Shortcuts,
      help: undefined, // TODO
      fields: [
        {
          type: 'shortcut',
          label: trans('Align Markdown table under cursor'),
          model: 'shortcuts.editor.table-align',
          defaultShortcut: sc('table-align')
        },
        {
          type: 'shortcut',
          label: trans('Align table column left'),
          model: 'shortcuts.editor.table-align-col-left',
          defaultShortcut: sc('table-align-col-left')
        },
        {
          type: 'shortcut',
          label: trans('Align table column center'),
          model: 'shortcuts.editor.table-align-col-center',
          defaultShortcut: sc('table-align-col-center')
        },
        {
          type: 'shortcut',
          label: trans('Align table column right'),
          model: 'shortcuts.editor.table-align-col-right',
          defaultShortcut: sc('table-align-col-right')
        }
      ]
    },
    {
      title: trans('Transform Shortcuts'),
      infoString: trans('Assign shortcuts to your frequently used text transformations here.') + disclaimer,
      group: PreferencesGroups.Shortcuts,
      help: undefined, // TODO
      fields: [
        {
          type: 'shortcut',
          label: trans('Zap Gremlins'),
          model: 'shortcuts.editor.tr-zap-gremlins',
          defaultShortcut: sc('tr-zap-gremlins')
        },
        {
          type: 'shortcut',
          label: trans('Strip duplicate spaces'),
          model: 'shortcuts.editor.tr-strip-duplicate-spaces',
          defaultShortcut: sc('tr-strip-duplicate-spaces')
        },
        {
          type: 'shortcut',
          label: trans('Italics to quotes'),
          model: 'shortcuts.editor.tr-italics-to-quotes',
          defaultShortcut: sc('tr-italics-to-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Quotes to italics'),
          model: 'shortcuts.editor.tr-quotes-to-italics',
          defaultShortcut: sc('tr-quotes-to-italics')
        },
        {
          type: 'shortcut',
          label: trans('Remove line breaks'),
          model: 'shortcuts.editor.tr-remove-line-breaks',
          defaultShortcut: sc('tr-remove-line-breaks')
        },
        {
          type: 'shortcut',
          label: trans('Straighten quotes'),
          model: 'shortcuts.editor.tr-straighten-quotes',
          defaultShortcut: sc('tr-straighten-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Convert quotes to Magic Quotes'),
          model: 'shortcuts.editor.tr-quotes-to-magic',
          defaultShortcut: sc('tr-quotes-to-magic')
        },
        {
          type: 'shortcut',
          label: trans('Ensure double quotes'),
          model: 'shortcuts.editor.tr-ensure-double-quotes',
          defaultShortcut: sc('tr-ensure-double-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Double quotes to single'),
          model: 'shortcuts.editor.tr-double-quotes-to-single',
          defaultShortcut: sc('tr-double-quotes-to-single')
        },
        {
          type: 'shortcut',
          label: trans('Single quotes to double'),
          model: 'shortcuts.editor.tr-single-quotes-to-double',
          defaultShortcut: sc('tr-single-quotes-to-double')
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Add spaces around'),
          model: 'shortcuts.editor.tr-emdash-add-spaces',
          defaultShortcut: sc('tr-emdash-add-spaces')
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Remove spaces around'),
          model: 'shortcuts.editor.tr-emdash-remove-spaces',
          defaultShortcut: sc('tr-emdash-remove-spaces')
        },
        {
          type: 'shortcut',
          label: trans('To sentence case'),
          model: 'shortcuts.editor.tr-sentence-case',
          defaultShortcut: sc('tr-sentence-case')
        },
        {
          type: 'shortcut',
          label: trans('To title case'),
          model: 'shortcuts.editor.tr-title-case',
          defaultShortcut: sc('tr-title-case')
        }
      ]
    }
  ]
}
