/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Export Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the export tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import { ProgrammaticallyOpenableWindows } from '@providers/commands/open-aux-window'
const ipcRenderer = window.ipc

export function getImportExportFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Import and export profiles'),
      group: PreferencesGroups.ImportExport,
      help: undefined, // TODO
      fields: [
        {
          type: 'button',
          label: trans('Open import profiles editor'),
          onClick: () => {
            ipcRenderer.invoke('application', {
              command: 'open-aux-window',
              payload: {
                window: ProgrammaticallyOpenableWindows.AssetsWindow,
                hash: 'tab-import-control'
              }
            })
              .catch(err => console.error(err))
          }
        },
        {
          type: 'button',
          label: trans('Open export profiles editor'),
          onClick: () => {
            ipcRenderer.invoke('application', {
              command: 'open-aux-window',
              payload: {
                window: ProgrammaticallyOpenableWindows.AssetsWindow,
                hash: 'tab-export-control'
              }
            })
              .catch(err => console.error(err))
          }
        }
      ] // TODO: Add two buttons "Open import profiles editor" and "Open export profiles editor"
    },
    {
      title: trans('Export settings'),
      group: PreferencesGroups.ImportExport,
      help: undefined, // TODO
      fields: [
        {
          type: 'checkbox', // TODO: Must be radio; second option "Use system-wide Pandoc for exports"
          label: trans('Use Zettlr\'s internal Pandoc for exports'),
          model: 'export.useBundledPandoc'
        },
        {
          type: 'checkbox',
          label: trans('Automatically open successfully exported files'),
          model: 'export.autoOpenExportedFiles'
        },
        {
          type: 'checkbox',
          label: trans('Enforce highlight extension on export'),
          info: trans('When enabled, Zettlr will automatically enable the "mark"-extension when exporting Markdown files.'),
          model: 'export.enforceMarkSupport'
        },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: trans('Remove tags from files when exporting'),
          model: 'export.stripTags'
        },
        { type: 'separator' },
        {
          type: 'radio',
          label: trans('Internal links'),
          model: 'export.stripLinks',
          options: {
            full: trans('Remove internal links completely'),
            unlink: trans('Unlink internal links'),
            no: trans('Don\'t touch internal links')
          }
        },
        { type: 'separator' },
        {
          type: 'radio',
          label: trans('Destination folder for exported files'),
          model: 'export.dir',
          options: {
            // TODO: Add info-strings
            temp: trans('Temporary folder'),
            cwd: trans('Same as file location'),
            ask: trans('Ask for folder when exporting')
          }
        },
        {
          type: 'form-text',
          display: 'info',
          contents: trans('Warning! Files in the temporary folder are regularly deleted. Choosing the same location as the file overwrites files with identical filenames if they already exist.')
        }
      ]
    },
    {
      title: trans('Custom export commands'),
      group: PreferencesGroups.ImportExport,
      help: undefined, // TODO
      fields: [
        {
          type: 'list',
          valueType: 'record',
          keyNames: [ 'displayName', 'command' ],
          columnLabels: [ trans('Display name'), trans('Command') ],
          label: trans('Enter custom commands to run the exporter with. Each command receives as its first argument the file or project folder to be exported.'),
          model: 'export.customCommands',
          deletable: true,
          searchable: true,
          addable: true,
          editable: true
        }
      ]
    }
  ]
}
