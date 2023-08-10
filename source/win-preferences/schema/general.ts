/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        General Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the general tab schema.
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
          type: 'select',
          label: trans('Application language'),
          model: 'appLang',
          options: {} // Will be set dynamically
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Dark mode'),
          model: 'darkMode'
        },
        {
          type: 'checkbox',
          label: trans('Show file information'),
          model: 'fileMeta'
        },
        {
          type: 'checkbox',
          label: trans('Always load remote changes to the current file'),
          model: 'alwaysReloadFiles'
        },
        {
          type: 'checkbox',
          label: trans('Avoid opening files in new tabs if possible'),
          model: 'system.avoidNewTabs'
        }
      ],
      [
        {
          type: 'radio',
          label: trans('Automatically switch to dark mode'),
          model: 'autoDarkMode',
          options: {
            'off': trans('Off'),
            'schedule': trans('Schedule'),
            'system': trans('Follow Operating System')
          }
        },
        {
          type: 'time',
          label: trans('Start dark mode at'),
          model: 'autoDarkModeStart',
          inline: true
        },
        {
          type: 'time',
          label: trans('End dark mode at'),
          model: 'autoDarkModeEnd',
          inline: true
        }
      ],
      [
        {
          type: 'radio',
          label: trans('File manager mode'),
          model: 'fileManagerMode',
          options: {
            'thin': trans('Thin &mdash; show either file tree or file list'),
            'expanded': trans('Expanded &mdash; show both file tree and file list'),
            'combined': trans('Combined &mdash; show files and directories in the file tree')
          }
        },
        {
          type: 'radio',
          label: trans('Display files using'),
          model: 'fileNameDisplay',
          options: {
            'filename': trans('Filename only'),
            'title': trans('Title if applicable'),
            'heading': trans('First heading level 1 if applicable'),
            'title+heading': trans('Title or first heading level 1 if applicable')
          }
        },
        {
          type: 'checkbox',
          label: trans('Display Markdown file extensions'),
          model: 'display.markdownFileExtensions',
          disabled: window.config.get('fileNameDisplay') !== 'filename'
        }
      ],
      [
        {
          type: 'radio',
          label: trans('Sorting order for files (used for sorting by name)'),
          model: 'sorting',
          options: {
            'natural': trans('Natural order (10 after 2)'),
            'ascii': trans('ASCII order (2 after 10)')
          }
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Show folders above files'),
          model: 'sortFoldersFirst'
        }
      ],
      [
        {
          type: 'radio',
          label: trans('When sorting by time, sort by'),
          model: 'sortingTime',
          options: {
            'modtime': trans('Last modification time'),
            'creationtime': trans('File creation time')
          }
        },
        {
          type: 'radio',
          label: trans('In the file metadata display'),
          model: 'fileMetaTime',
          options: {
            'modtime': trans('Last modification time'),
            'creationtime': trans('File creation time')
          }
        }
      ]
    ]
  } satisfies FormSchema
}
