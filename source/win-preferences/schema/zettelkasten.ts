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
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getZettelkastenFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Zettelkasten IDs'),
      group: PreferencesGroups.Zettelkasten,
      help: '', // TODO
      fields: [
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
      ]
    },
    {
      title: trans('Internal links'),
      group: PreferencesGroups.Zettelkasten,
      help: '', // TODO
      fields: [
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
            always: trans('always'),
            withID: trans('only when linking using the ID'),
            never: trans('never')
          },
          disabled: window.config.get('zkn.linkFilenameOnly') === true
        },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: trans('Start a search when following Zettelkasten-links'),
          model: 'zkn.autoSearch'
        },
        {
          type: 'checkbox',
          label: trans('Automatically create non-existing files when following internal links'),
          model: 'zkn.autoCreateLinkedFiles' // TODO: Remove this option, infer from zkn.customDirectory!
        },
        {
          type: 'directory',
          label: trans('Put auto-created files into this directory (must be loaded in Zettlr)'),
          model: 'zkn.customDirectory',
          reset: ''
        }
      ]
    }
  ]
}
