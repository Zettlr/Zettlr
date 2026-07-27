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
import {
  type CustomEditorShortcut,
  type EditorShortcutName,
  defaultKeybindings as editorDefaults,
  getCustomShortcut as customEditorShortcut,
} from '@common/modules/markdown-editor/keymaps/shortcuts'
import {
  type MenuShortcutName,
  defaultKeybindings as menuDefaults,
  getCustomShortcut as customMenuShortcut
} from 'source/app/service-providers/menu/shortcuts'
import type {
  ConfigOptions,
  ConfigurableEditorShortcuts,
  ConfigurableUIShortcuts
} from 'source/app/service-providers/config/get-config-template.js'

/**
 * Utility function that checks the shortcut list for conflicts. For this,
 * provide the shortcut to search for conflicts as well as the lists of custom
 * shortcuts. It then checks all lists of available shortcuts and returns
 * all those shortcut names which have the same shortcut assigned (both by
 * default and from the custom shortcut maps).
 *
 * @param   {EditorShortcutName|MenuShortcutName}  name       The shortcut ID in question
 * @param   {CustomEditorShortcut[]}               editorMap  A list of custom editor shortcuts
 * @param   {ConfigOptions["shortcuts"]["ui"]}     menuMap    A list of custom menu shortcuts
 *
 * @return  {string[]}                                        All conflicting shortcut names.
 */
export function getConflicts (
  name: EditorShortcutName|MenuShortcutName,
  editorMap: CustomEditorShortcut[],
  menuMap: ConfigOptions['shortcuts']['ui']
): string[] {
  let thisShortcut: string|undefined
  if (Object.keys(editorDefaults).includes(name)) {
    thisShortcut = customEditorShortcut(name as EditorShortcutName, editorMap)
  } else {
    thisShortcut = customMenuShortcut(name as MenuShortcutName, menuMap)
  }

  if (thisShortcut === undefined) {
    return []
  }

  const editorConflicts: EditorShortcutName[] = []

  for (const shortcutName of Object.keys(editorDefaults) as EditorShortcutName[]) {
    if (shortcutName === name) {
      continue
    }

    const shortcut = customEditorShortcut(shortcutName, editorMap)

    if (shortcut !== undefined && shortcut === thisShortcut) {
      editorConflicts.push(shortcutName)
    }
  }

  const menuConflicts: MenuShortcutName[] = []

  for (const shortcutName of Object.keys(menuDefaults) as MenuShortcutName[]) {
    if (shortcutName === name) {
      continue
    }

    const shortcut = customMenuShortcut(shortcutName, menuMap)
    if (shortcut !== undefined && shortcut === thisShortcut) {
      menuConflicts.push(shortcutName)
    }
  }

  return (editorConflicts as string[]).concat(menuConflicts)
}

export function getShortcutFields (config: ConfigOptions): PreferencesFieldset[] {
  // For the time being, we'll declare this feature as experimental to ensure we
  // can tweak that accordingly.
  const disclaimer = ' WARNING: EXPERIMENTAL FEATURE. This feature may still change at any time without prior communication.'

  // Returns the default for the provided editor shortcut
  const defaultEditorShortcut = (name: ConfigurableEditorShortcuts) => {
    return getDefaultKeybinding(name, editorDefaults)
  }

  // Returns the default for the provided menu/UI shortcut
  const defaultUIShortcut = (name: ConfigurableUIShortcuts) => {
    return getDefaultKeybinding(name, menuDefaults)
  }

  // Third utility function to determine conflicts across the maps
  const conflicts = (name: EditorShortcutName|MenuShortcutName) => {
    return getConflicts(name, editorMap, config.shortcuts.ui)
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
          conflicts: conflicts('table-align')
        },
        {
          type: 'shortcut',
          label: trans('Align table column left'),
          model: 'shortcuts.editor.table-align-col-left',
          defaultShortcut: defaultEditorShortcut('table-align-col-left'),
          conflicts: conflicts('table-align-col-left')
        },
        {
          type: 'shortcut',
          label: trans('Align table column center'),
          model: 'shortcuts.editor.table-align-col-center',
          defaultShortcut: defaultEditorShortcut('table-align-col-center'),
          conflicts: conflicts('table-align-col-center')
        },
        {
          type: 'shortcut',
          label: trans('Align table column right'),
          model: 'shortcuts.editor.table-align-col-right',
          defaultShortcut: defaultEditorShortcut('table-align-col-right'),
          conflicts: conflicts('table-align-col-right')
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
          conflicts: conflicts('tr-zap-gremlins')
        },
        {
          type: 'shortcut',
          label: trans('Strip duplicate spaces'),
          model: 'shortcuts.editor.tr-strip-duplicate-spaces',
          defaultShortcut: defaultEditorShortcut('tr-strip-duplicate-spaces'),
          conflicts: conflicts('tr-strip-duplicate-spaces')
        },
        {
          type: 'shortcut',
          label: trans('Italics to quotes'),
          model: 'shortcuts.editor.tr-italics-to-quotes',
          defaultShortcut: defaultEditorShortcut('tr-italics-to-quotes'),
          conflicts: conflicts('tr-italics-to-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Quotes to italics'),
          model: 'shortcuts.editor.tr-quotes-to-italics',
          defaultShortcut: defaultEditorShortcut('tr-quotes-to-italics'),
          conflicts: conflicts('tr-quotes-to-italics')
        },
        {
          type: 'shortcut',
          label: trans('Remove line breaks'),
          model: 'shortcuts.editor.tr-remove-line-breaks',
          defaultShortcut: defaultEditorShortcut('tr-remove-line-breaks'),
          conflicts: conflicts('tr-remove-line-breaks')
        },
        {
          type: 'shortcut',
          label: trans('Straighten quotes'),
          model: 'shortcuts.editor.tr-straighten-quotes',
          defaultShortcut: defaultEditorShortcut('tr-straighten-quotes'),
          conflicts: conflicts('tr-straighten-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Convert quotes to Magic Quotes'),
          model: 'shortcuts.editor.tr-quotes-to-magic',
          defaultShortcut: defaultEditorShortcut('tr-quotes-to-magic'),
          conflicts: conflicts('tr-quotes-to-magic')
        },
        {
          type: 'shortcut',
          label: trans('Ensure double quotes'),
          model: 'shortcuts.editor.tr-ensure-double-quotes',
          defaultShortcut: defaultEditorShortcut('tr-ensure-double-quotes'),
          conflicts: conflicts('tr-ensure-double-quotes')
        },
        {
          type: 'shortcut',
          label: trans('Double quotes to single'),
          model: 'shortcuts.editor.tr-double-quotes-to-single',
          defaultShortcut: defaultEditorShortcut('tr-double-quotes-to-single'),
          conflicts: conflicts('tr-double-quotes-to-single')
        },
        {
          type: 'shortcut',
          label: trans('Single quotes to double'),
          model: 'shortcuts.editor.tr-single-quotes-to-double',
          defaultShortcut: defaultEditorShortcut('tr-single-quotes-to-double'),
          conflicts: conflicts('tr-single-quotes-to-double')
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Add spaces around'),
          model: 'shortcuts.editor.tr-emdash-add-spaces',
          defaultShortcut: defaultEditorShortcut('tr-emdash-add-spaces'),
          conflicts: conflicts('tr-emdash-add-spaces')
        },
        {
          type: 'shortcut',
          label: trans('Emdash — Remove spaces around'),
          model: 'shortcuts.editor.tr-emdash-remove-spaces',
          defaultShortcut: defaultEditorShortcut('tr-emdash-remove-spaces'),
          conflicts: conflicts('tr-emdash-remove-spaces')
        },
        {
          type: 'shortcut',
          label: trans('To sentence case'),
          model: 'shortcuts.editor.tr-sentence-case',
          defaultShortcut: defaultEditorShortcut('tr-sentence-case'),
          conflicts: conflicts('tr-sentence-case')
        },
        {
          type: 'shortcut',
          label: trans('To title case'),
          model: 'shortcuts.editor.tr-title-case',
          defaultShortcut: defaultEditorShortcut('tr-title-case'),
          conflicts: conflicts('tr-title-case')
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
          defaultShortcut: defaultUIShortcut('next-tab'),
          conflicts: conflicts('next-tab')
        },
        {
          type: 'shortcut',
          label: trans('Switch to previous tab'),
          model: 'shortcuts.ui.previous-tab',
          defaultShortcut: defaultUIShortcut('previous-tab'),
          conflicts: conflicts('previous-tab')
        },
        {
          type: 'shortcut',
          label: trans('Filter files'),
          model: 'shortcuts.ui.filter-files',
          defaultShortcut: defaultUIShortcut('filter-files'),
          conflicts: conflicts('filter-files')
        }
      ]
    }
  ]
}
