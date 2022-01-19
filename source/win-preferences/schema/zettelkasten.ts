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

export default function (): any {
  return {
    fieldsets: [
      [
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.id_label'),
          model: 'zkn.idRE',
          reset: '(\\d{14})' // Default enables the reset button
        },
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.linkstart_label'),
          model: 'zkn.linkStart',
          reset: '[['
        },
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.linkend_label'),
          model: 'zkn.linkEnd',
          reset: ']]'
        },
        {
          type: 'text',
          label: trans('dialog.preferences.zkn.id_generator_label'),
          model: 'zkn.idGen',
          reset: '%Y%M%D%h%m%s',
          info: 'Variables: %Y, %y, %M, %D, %W, %h, %m, %s, %X, %uuid4'
        }
      ],
      [
        {
          type: 'fieldset-label', // TODO: Create this type
          text: trans('dialog.preferences.export.stripping')
        },
        {
          type: 'checkbox',
          label: 'Link with filename only',
          model: 'zkn.linkFilenameOnly'
        },
        {
          type: 'radio',
          label: trans('dialog.preferences.zkn.link_behaviour_description'),
          model: 'zkn.linkWithFilename',
          options: {
            'always': trans('dialog.preferences.zkn.link_behaviour_always'),
            'withID': trans('dialog.preferences.zkn.link_behaviour_id'),
            'never': trans('dialog.preferences.zkn.link_behaviour_never')
          },
          disabled: global.config.get('zkn.linkFilenameOnly') === true
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.zkn.auto_search'),
          model: 'zkn.autoSearch'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.zkn.auto_create_file'),
          model: 'zkn.autoCreateLinkedFiles'
        },
        {
          type: 'directory',
          label: trans('dialog.preferences.zkn.custom_directory'),
          model: 'zkn.customDirectory',
          reset: ''
        }
      ]
    ]
  }
}
