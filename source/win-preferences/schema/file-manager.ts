/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File Manager Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the file manager tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'

export function getFileManagerFields (config: ConfigOptions): PreferencesFieldset[] {
  return [
    {
      title: trans('Display mode'),
      group: PreferencesGroups.FileManager,
      help: undefined, // TODO
      fields: [
        {
          type: 'radio',
          model: 'fileManagerMode',
          inline: true,
          options: {
            thin: trans('Thin'),
            expanded: trans('Expanded'),
            combined: trans('Combined')
          }
        },
        {
          type: 'form-text',
          display: 'info',
          contents: trans('The Thin mode shows your directories and files separately. Select a directory to have its contents displayed in the file list. Switch between file list and directory tree by clicking on directories or the arrow button which appears at the top left corner of the file list.')
        },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: trans('Show file information'),
          model: 'fileMeta'
        },
        {
          type: 'checkbox',
          label: trans('Show folders above files'),
          model: 'sortFoldersFirst'
        }
      ]
    },
    {
      title: trans('Markdown document name display'),
      group: PreferencesGroups.FileManager,
      help: undefined, // TODO
      fields: [
        {
          type: 'radio',
          model: 'fileNameDisplay',
          options: {
            filename: trans('Filename only'),
            title: trans('Title if applicable'),
            heading: trans('First heading level 1 if applicable'),
            'title+heading': trans('Title or first heading level 1 if applicable')
          }
        },
        {
          // TODO: Checkbox onto the first line of the radio
          type: 'checkbox',
          label: trans('Display Markdown file extensions'),
          model: 'display.markdownFileExtensions',
          disabled: config.fileNameDisplay !== 'filename'
        }
      ]
    },
    {
      title: trans('Time display'),
      group: PreferencesGroups.FileManager,
      help: undefined, // TODO
      fields: [
        {
          type: 'radio',
          model: 'fileMetaTime',
          options: {
            modtime: trans('Last modification time'),
            creationtime: trans('File creation time')
          }
        }
      ]
    },
    {
      title: trans('Sorting'),
      group: PreferencesGroups.FileManager,
      help: undefined, // TODO
      fields: [
        {
          type: 'radio',
          label: trans('When sorting documents…'),
          model: 'sorting',
          options: {
            natural: trans('Use natural order (2 comes before 10)'),
            ascii: trans('Use ASCII order (2 comes after 10)')
          }
        }
      ]
    }
  ]
}
