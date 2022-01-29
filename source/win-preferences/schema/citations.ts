/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Citation Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the citation tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'

export default function (): any {
  return {
    fieldsets: [
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.cite_style_label'),
          model: 'editor.citeStyle',
          options: {
            'regular': '[@Author2015, p. 123] → (Author 2015, 123)',
            'in-text': '@Author2015 → Author (2015)',
            'in-text-suffix': '@Author2015 [p. 123] → Author (2015, 123)'
          }
        }
      ],
      [
        {
          type: 'file',
          label: trans('dialog.preferences.citation_database'),
          model: 'export.cslLibrary',
          reset: '',
          filter: {
            'json, yaml, yml': 'CSL JSON',
            'bib': 'BibTeX'
          }
        },
        {
          type: 'file',
          label: trans('dialog.preferences.project.csl_style'),
          model: 'export.cslStyle',
          reset: '',
          filter: {
            'csl': 'CSL Style'
          }
        }
      ]
    ]
  }
}
