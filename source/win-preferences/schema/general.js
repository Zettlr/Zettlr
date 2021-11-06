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

import { trans } from '../../common/i18n-renderer'

export default function () {
  return {
    fieldsets: [
      [
        {
          type: 'select',
          label: trans('dialog.preferences.app_lang.title'),
          model: 'appLang',
          options: {} // Will be set dynamically
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.dark_mode'),
          model: 'darkMode'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.file_meta'),
          model: 'fileMeta'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.hide_dirs'),
          model: 'hideDirs'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.always_reload_files'),
          model: 'alwaysReloadFiles'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.avoid_new_tabs'),
          model: 'system.avoidNewTabs'
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.auto_dark_mode_explanation'),
          model: 'autoDarkMode',
          options: {
            'off': trans('dialog.preferences.auto_dark_mode_off'),
            'schedule': trans('dialog.preferences.auto_dark_mode_schedule'),
            'system': trans('dialog.preferences.auto_dark_mode_system')
          }
        },
        {
          type: 'time',
          label: 'Start dark mode at',
          model: 'autoDarkModeStart',
          inline: true
        },
        {
          type: 'time',
          label: 'End dark mode at',
          model: 'autoDarkModeEnd',
          inline: true
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.filemanager_explanation'),
          model: 'fileManagerMode',
          options: {
            'thin': trans('dialog.preferences.filemanager_thin'),
            'expanded': trans('dialog.preferences.filemanager_expanded'),
            'combined': trans('dialog.preferences.filemanager_combined')
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.sorting_explanation'),
          model: 'sorting',
          options: {
            'natural': trans('dialog.preferences.sorting_natural'),
            'ascii': trans('dialog.preferences.sorting_ascii')
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.sorting_time_explanation'),
          model: 'sortingTime',
          options: {
            'modtime': trans('dialog.preferences.modtime'),
            'creationtime': trans('dialog.preferences.creationtime')
          }
        },
        {
          type: 'radio',
          label: trans('dialog.preferences.display_time_explanation'),
          model: 'fileMetaTime',
          options: {
            'modtime': trans('dialog.preferences.modtime'),
            'creationtime': trans('dialog.preferences.creationtime')
          }
        }
      ]
    ]
  }
}
