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
import { type CustomEditorShortcut, defaultKeybindings as editorDefaults, getConflicts } from '@common/modules/markdown-editor/keymaps/shortcuts'
import { defaultKeybindings as menuDefaults } from 'source/app/service-providers/menu/shortcuts'
import type { ConfigOptions, ConfigurableEditorShortcuts, ConfigurableUIShortcuts } from 'source/app/service-providers/config/get-config-template.js'

export function getShortcutFields (config: ConfigOptions): PreferencesFieldset[] {
  // For the time being, we'll declare this feature as experimental to ensure we
  // can tweak that accordingly.
  const disclaimer = ' WARNING: EXPERIMENTAL FEATURE. This feature may still change at any time without prior communication.'

  // Utility functions to retrieve the default keybindings
  const defaultEditorShortcut = (name: ConfigurableEditorShortcuts) => {
    return getDefaultKeybinding(name, editorDefaults)
  }

  const defaultUIShortcut = (name: ConfigurableUIShortcuts) => {
    return getDefaultKeybinding(name, menuDefaults)
  }

  // Necessary for conflict detection
  const editorMap = Object.entries(config.shortcuts.editor)
    .map(([ name, shortcut ]) => ({ name, shortcut }))
    .filter((shortcut): shortcut is CustomEditorShortcut => shortcut.shortcut !== undefined)

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
          defaultShortcut: defaultEditorShortcut('table-align'),
          conflicts: getConflicts('table-align', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Align table column left'),
          model: 'shortcuts.editor.table-align-col-left',
          defaultShortcut: defaultEditorShortcut('table-align-col-left'),
          conflicts: getConflicts('table-align-col-left', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Align table column center'),
          model: 'shortcuts.editor.table-align-col-center',
          defaultShortcut: defaultEditorShortcut('table-align-col-center'),
          conflicts: getConflicts('table-align-col-center', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Align table column right'),
          model: 'shortcuts.editor.table-align-col-right',
          defaultShortcut: defaultEditorShortcut('table-align-col-right'),
          conflicts: getConflicts('table-align-col-right', editorMap)
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
          defaultShortcut: defaultEditorShortcut('tr-zap-gremlins'),
          conflicts: getConflicts('tr-zap-gremlins', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Strip duplicate spaces'),
          model: 'shortcuts.editor.tr-strip-duplicate-spaces',
          defaultShortcut: defaultEditorShortcut('tr-strip-duplicate-spaces'),
          conflicts: getConflicts('tr-strip-duplicate-spaces', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Italics to quotes'),
          model: 'shortcuts.editor.tr-italics-to-quotes',
          defaultShortcut: defaultEditorShortcut('tr-italics-to-quotes'),
          conflicts: getConflicts('tr-italics-to-quotes', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Quotes to italics'),
          model: 'shortcuts.editor.tr-quotes-to-italics',
          defaultShortcut: defaultEditorShortcut('tr-quotes-to-italics'),
          conflicts: getConflicts('tr-quotes-to-italics', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Remove line breaks'),
          model: 'shortcuts.editor.tr-remove-line-breaks',
          defaultShortcut: defaultEditorShortcut('tr-remove-line-breaks'),
          conflicts: getConflicts('tr-remove-line-breaks', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Straighten quotes'),
          model: 'shortcuts.editor.tr-straighten-quotes',
          defaultShortcut: defaultEditorShortcut('tr-straighten-quotes'),
          conflicts: getConflicts('tr-straighten-quotes', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Convert quotes to Magic Quotes'),
          model: 'shortcuts.editor.tr-quotes-to-magic',
          defaultShortcut: defaultEditorShortcut('tr-quotes-to-magic'),
          conflicts: getConflicts('tr-quotes-to-magic', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Ensure double quotes'),
          model: 'shortcuts.editor.tr-ensure-double-quotes',
          defaultShortcut: defaultEditorShortcut('tr-ensure-double-quotes'),
          conflicts: getConflicts('tr-ensure-double-quotes', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Double quotes to single'),
          model: 'shortcuts.editor.tr-double-quotes-to-single',
          defaultShortcut: defaultEditorShortcut('tr-double-quotes-to-single'),
          conflicts: getConflicts('tr-double-quotes-to-single', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Single quotes to double'),
          model: 'shortcuts.editor.tr-single-quotes-to-double',
          defaultShortcut: defaultEditorShortcut('tr-single-quotes-to-double'),
          conflicts: getConflicts('tr-single-quotes-to-double', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Add spaces around'),
          model: 'shortcuts.editor.tr-emdash-add-spaces',
          defaultShortcut: defaultEditorShortcut('tr-emdash-add-spaces'),
          conflicts: getConflicts('tr-emdash-add-spaces', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Remove spaces around'),
          model: 'shortcuts.editor.tr-emdash-remove-spaces',
          defaultShortcut: defaultEditorShortcut('tr-emdash-remove-spaces'),
          conflicts: getConflicts('tr-emdash-remove-spaces', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('To sentence case'),
          model: 'shortcuts.editor.tr-sentence-case',
          defaultShortcut: defaultEditorShortcut('tr-sentence-case'),
          conflicts: getConflicts('tr-sentence-case', editorMap)
        },
        {
          type: 'shortcut',
          label: trans('To title case'),
          model: 'shortcuts.editor.tr-title-case',
          defaultShortcut: defaultEditorShortcut('tr-title-case'),
          conflicts: getConflicts('tr-title-case', editorMap)
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
