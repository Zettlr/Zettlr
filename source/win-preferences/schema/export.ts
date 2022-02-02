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

export default function (): any {
  return {
    fieldsets: [
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.export.use_bundled_pandoc'),
          model: 'export.useBundledPandoc'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.export.strip_tags_label'),
          model: 'export.stripTags'
        }
      ],
      [
        {
          type: 'radio',
          label: '', // TODO
          model: 'export.stripLinks',
          options: {
            'full': trans('dialog.preferences.export.strip_links_full_label'),
            'unlink': trans('dialog.preferences.export.strip_links_unlink_label'),
            'no': trans('dialog.preferences.export.strip_links_no_label')
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.export.dest'),
          model: 'export.dir',
          options: {
            'temp': trans('dialog.preferences.export.dest_temp_label'),
            'cwd': trans('dialog.preferences.export.dest_cwd_label'),
            'ask': trans('dialog.preferences.export.dest_ask_label')
          }
        }
      ]
    ]
  }
}
