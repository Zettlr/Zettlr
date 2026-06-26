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
import { defaultKeybindings as editorDefaults, type EditorShortcutName } from '@common/modules/markdown-editor/keymaps/shortcuts'
import { type MenuShortcutName, defaultKeybindings as menuDefaults } from 'source/app/service-providers/menu/shortcuts'

export function getShortcutFields (): PreferencesFieldset[] {
  // For the time being, we'll declare this feature as experimental to ensure we
  // can tweak that accordingly.
  const disclaimer = ' WARNING: EXPERIMENTAL FEATURE. This feature may still change at any time without prior communication.'

  // Utility functions to retrieve the default keybindings
  const defaultEditorShortcut = (name: EditorShortcutName) => {
    return getDefaultKeybinding(name, editorDefaults)
  }

  const defaultUIShortcut = (name: MenuShortcutName) => {
    return getDefaultKeybinding(name, menuDefaults)
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
          defaultShortcut: defaultEditorShortcut('table-align')
        },
        {
          type: 'shortcut',
          label: trans('Align table column left'),
          model: 'shortcuts.editor.table-align-col-left',
          defaultShortcut: defaultEditorShortcut('table-align-col-left')
        },
        {
          type: 'shortcut',
          label: trans('Align table column center'),
          model: 'shortcuts.editor.table-align-col-center',
          defaultShortcut: defaultEditorShortcut('table-align-col-center')
        },
        {
          type: 'shortcut',
          label: trans('Align table column right'),
          model: 'shortcuts.editor.table-align-col-right',
          defaultShortcut: defaultEditorShortcut('table-align-col-right')
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
          defaultShortcut: defaultEditorShortcut('tr-zap-gremlins')
        },
        {
          type: 'shortcut',
          label: trans('Strip duplicate spaces'),
          model: 'shortcuts.editor.tr-strip-duplicate-spaces',
          defaultShortcut: defaultEditorShortcut('tr-strip-duplicate-spaces')
        },
        {
          type: 'shortcut',
          label: trans('Italics to quotes'),
          model: 'shortcuts.editor.tr-italics-to-quotes',
          defaultShortcut: defaultEditorShortcut('tr-italics-to-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Quotes to italics'),
          model: 'shortcuts.editor.tr-quotes-to-italics',
          defaultShortcut: defaultEditorShortcut('tr-quotes-to-italics')
        },
        {
          type: 'shortcut',
          label: trans('Remove line breaks'),
          model: 'shortcuts.editor.tr-remove-line-breaks',
          defaultShortcut: defaultEditorShortcut('tr-remove-line-breaks')
        },
        {
          type: 'shortcut',
          label: trans('Straighten quotes'),
          model: 'shortcuts.editor.tr-straighten-quotes',
          defaultShortcut: defaultEditorShortcut('tr-straighten-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Convert quotes to Magic Quotes'),
          model: 'shortcuts.editor.tr-quotes-to-magic',
          defaultShortcut: defaultEditorShortcut('tr-quotes-to-magic')
        },
        {
          type: 'shortcut',
          label: trans('Ensure double quotes'),
          model: 'shortcuts.editor.tr-ensure-double-quotes',
          defaultShortcut: defaultEditorShortcut('tr-ensure-double-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Double quotes to single'),
          model: 'shortcuts.editor.tr-double-quotes-to-single',
          defaultShortcut: defaultEditorShortcut('tr-double-quotes-to-single')
        },
        {
          type: 'shortcut',
          label: trans('Single quotes to double'),
          model: 'shortcuts.editor.tr-single-quotes-to-double',
          defaultShortcut: defaultEditorShortcut('tr-single-quotes-to-double')
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Add spaces around'),
          model: 'shortcuts.editor.tr-emdash-add-spaces',
          defaultShortcut: defaultEditorShortcut('tr-emdash-add-spaces')
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Remove spaces around'),
          model: 'shortcuts.editor.tr-emdash-remove-spaces',
          defaultShortcut: defaultEditorShortcut('tr-emdash-remove-spaces')
        },
        {
          type: 'shortcut',
          label: trans('To sentence case'),
          model: 'shortcuts.editor.tr-sentence-case',
          defaultShortcut: defaultEditorShortcut('tr-sentence-case')
        },
        {
          type: 'shortcut',
          label: trans('To title case'),
          model: 'shortcuts.editor.tr-title-case',
          defaultShortcut: defaultEditorShortcut('tr-title-case')
        }
      ]
    },
    {
      title: trans('UI Shortcuts'),
      infoString: trans('Customize general user interface shortcuts here.') + disclaimer,
      group: PreferencesGroups.Shortcuts,
      help: undefined, // TODO
      fields: [
        {
          type: 'shortcut',
          label: trans('Switch to next tab'),
          model: 'shortcuts.ui.next-tab',
          defaultShortcut: defaultUIShortcut('next-tab')
        },
        {
          type: 'shortcut',
          label: trans('Switch to previous tab'),
          model: 'shortcuts.ui.previous-tab',
          defaultShortcut: defaultUIShortcut('previous-tab')
        }
      ]
    }
  ]
}
