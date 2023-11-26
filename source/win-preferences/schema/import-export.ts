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
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getImportExportFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Import and export profiles'),
      group: PreferencesGroups.ImportExport,
      help: '', // TODO
      fields: [] // TODO: Add two buttons "Open import profiles editor" and "Open export profiles editor"
    },
    {
      title: trans('Export settings'),
      group: PreferencesGroups.ImportExport,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox', // TODO: Must be radio
          label: trans('Use the internal Pandoc for exports'),
          model: 'export.useBundledPandoc'
        },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: trans('Remove tags from files'),
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
            temp: trans('Temporary directory: is regularly expunged'),
            cwd: trans('Current working directory: exported files will be saved into the currently selected directory.'),
            ask: trans('Ask for directory')
          }
        }
      ]
    },
    {
      title: trans('Custom export commands'),
      group: PreferencesGroups.ImportExport,
      help: '', // TODO
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
