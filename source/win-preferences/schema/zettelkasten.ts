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
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'

export function getZettelkastenFields (config: ConfigOptions): PreferencesFieldset[] {
  return [
    {
      title: trans('Zettelkasten IDs'),
      group: PreferencesGroups.Zettelkasten,
      help: undefined, // TODO
      fields: [
        {
          type: 'text',
          label: trans('Pattern for Zettelkasten IDs'),
          info: trans('Uses ECMAScript regular expressions'),
          model: 'zkn.idRE',
          reset: '(\\d{14})' // Default enables the reset button
        },
        {
          type: 'text',
          label: trans('Pattern used to generate new IDs'),
          model: 'zkn.idGen',
          reset: '%Y%M%D%h%m%s',
          info: trans('Available Variables: %s', '%Y, %y, %M, %D, %W, %h, %m, %s, %o, %X, %uuid4')
        }
      ]
    },
    {
      title: trans('Internal links'),
      group: PreferencesGroups.Zettelkasten,
      help: undefined, // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Link with filename only'),
          model: 'zkn.linkFilenameOnly'
        },
        {
          type: 'radio',
          label: trans('When linking files, add the document name …'),
          model: 'zkn.linkWithFilename',
          options: {
            always: trans('Always'),
            withID: trans('Only when linking using the ID'),
            never: trans('Never')
          },
          disabled: config.zkn.linkFilenameOnly
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Link format')
        },
        {
          type: 'form-text',
          display: 'info',
          contents: trans('Internal links allow you to add an optional title, separated by a vertical bar character from the actual link target. Here you can define the ordering of the two.')
        },
        {
          type: 'radio',
          model: 'zkn.linkFormat',
          options: {
            'link|title': trans('[[Link|Title]]: Link first (recommended)'),
            'title|link': trans('[[Title|Link]]: Title first')
          }
        },
        {
          type: 'separator'
        },
        {
          type: 'checkbox',
          label: trans('Start a full-text search when following internal links'),
          info: trans('The search string will match the content between the brackets: [[ ]].'),
          model: 'zkn.autoSearch'
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Automatically create non-existing files in this folder when following internal links')
        },
        {
          type: 'form-text',
          display: 'info',
          contents: trans('For this to work, the folder must be open as a Workspace in Zettlr.')
        },
        {
          type: 'directory',
          model: 'zkn.customDirectory',
          placeholder: trans('Path to folder'),
          reset: ''
        }
      ]
    }
  ]
}
