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
import { type FormSchema } from '@common/vue/form/Form.vue'

export default function (): FormSchema {
  return {
    fieldsets: [
      [
        {
          type: 'checkbox',
          label: trans('Use the internal Pandoc for exports'),
          model: 'export.useBundledPandoc'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Remove tags from files'),
          model: 'export.stripTags'
        }
      ],
      [
        {
          type: 'radio',
          label: '', // TODO
          model: 'export.stripLinks',
          options: {
            'full': trans('Remove internal links completely'),
            'unlink': trans('Unlink internal links'),
            'no': trans('Don\'t touch internal links')
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('Target directory for exported files. <em>Attention:</em> Selecting the current working directory will overwrite files without warning!'),
          model: 'export.dir',
          options: {
            'temp': trans('Temporary directory: is regularly expunged'),
            'cwd': trans('Current working directory: exported files will be saved into the currently selected directory.'),
            'ask': trans('Ask for directory')
          }
        }
      ],
      [
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
    ]
  } satisfies FormSchema
}
