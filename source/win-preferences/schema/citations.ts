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
          label: trans('How would you like autocomplete to insert your citations?'),
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
          label: trans('Citation Database (CSL JSON or BibTex)'),
          model: 'export.cslLibrary',
          reset: '',
          filter: {
            'json, yaml, yml, bib': 'CSL JSON or BibTeX',
            'json, yaml, yml': 'CSL JSON',
            'bib': 'BibTeX'
          }
        },
        {
          type: 'file',
          label: trans('CSL-Style (optional)'),
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
