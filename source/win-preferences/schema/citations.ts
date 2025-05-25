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
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'

export function getCitationFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Citations'),
      group: PreferencesGroups.Citations,
      help: undefined, // TODO
      fields: [
        {
          type: 'radio',
          label: trans('How would you like autocomplete to insert your citations?'),
          model: 'editor.citeStyle',
          options: {
            regular: '[@Author2015, p. 123] → (Author 2015, 123)',
            'in-text': '@Author2015 → Author (2015)',
            'in-text-suffix': '@Author2015 [p. 123] → Author (2015, 123)'
          }
        },
        { type: 'separator' },
        {
          type: 'file',
          label: trans('Citation database (CSL JSON or BibTex)'),
          model: 'export.cslLibrary',
          placeholder: trans('Path to file'),
          reset: '',
          filter: [
            { extensions: [ 'json', 'yaml', 'yml', 'bib' ], name: 'CSL JSON or BibTeX' },
            { extensions: [ 'json', 'yaml', 'yml' ], name: 'CSL JSON' },
            { extensions: ['bib'], name: 'BibTeX' }
          ]
        },
        {
          type: 'file',
          label: trans('CSL style (optional)'),
          model: 'export.cslStyle',
          placeholder: trans('Path to file'),
          reset: '',
          filter: [{ extensions: ['csl'], name: 'CSL Style' }]
        }
      ]
    }
  ]
}
