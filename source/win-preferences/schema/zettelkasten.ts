/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Zettelkasten Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the zettelkasten tab schema.
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
          type: 'text',
          label: trans('ID regular expression'),
          model: 'zkn.idRE',
          reset: '(\\d{14})' // Default enables the reset button
        },
        {
          type: 'text',
          label: trans('Pattern used to generate new IDs'),
          model: 'zkn.idGen',
          reset: '%Y%M%D%h%m%s',
          info: 'Variables: %Y, %y, %M, %D, %W, %h, %m, %s, %X, %uuid4'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Link with filename only'),
          model: 'zkn.linkFilenameOnly'
        },
        {
          type: 'radio',
          label: trans('When linking files, add the display name …'),
          model: 'zkn.linkWithFilename',
          options: {
            'always': trans('always'),
            'withID': trans('only when linking using the ID'),
            'never': trans('never')
          },
          disabled: window.config.get('zkn.linkFilenameOnly') === true
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Start a search when following Zettelkasten-links'),
          model: 'zkn.autoSearch'
        },
        {
          type: 'checkbox',
          label: trans('Automatically create non-existing files when following internal links'),
          model: 'zkn.autoCreateLinkedFiles'
        },
        {
          type: 'directory',
          label: trans('Put auto-created files into this directory (must be loaded in Zettlr)'),
          model: 'zkn.customDirectory',
          reset: ''
        }
      ]
    ]
  } satisfies FormSchema
}
