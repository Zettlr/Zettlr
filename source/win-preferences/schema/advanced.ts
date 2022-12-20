/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Advanced Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the advanced tab schema.
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
          label: trans('Pattern for new filenames'),
          model: 'newFileNamePattern',
          info: 'Variables: %id, %Y, %y, %M, %D, %W, %h, %m, %s, %X, %uuid4'
        },
        {
          type: 'checkbox',
          label: trans('Do not prompt for filename when creating new files'),
          model: 'newFileDontPrompt'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Enable debug mode'),
          model: 'debug'
        },
        {
          type: 'checkbox',
          label: trans('Notify me about beta releases'),
          model: 'checkForBeta'
        },
        {
          type: 'checkbox',
          label: trans('Use native window appearance'),
          model: 'window.nativeAppearance',
          disabled: process.platform !== 'linux'
        },
        {
          type: 'checkbox',
          label: trans('Delete items irreversibly, if moving them to trash fails'),
          model: 'system.deleteOnFail'
        },
        {
          type: 'checkbox',
          label: process.platform === 'darwin'
            ? trans('Show app in the notification area')
            : trans('Leave app running in the notification area'),
          model: 'system.leaveAppRunning',
          disabled: process.env.ZETTLR_IS_TRAY_SUPPORTED === '0',
          info: process.env.ZETTLR_TRAY_ERROR
        },
        {
          type: 'checkbox',
          label: trans('Automatically check for updates'),
          model: 'system.checkForUpdates'
        }
      ],
      [
        {
          type: 'token',
          label: trans('Enter all file extensions that you want to see in your attachment sidebar. Separate them with a comma. Changes are recognised after a restart.'),
          model: 'attachmentExtensions'
        }
      ],
      [
        {
          type: 'radio',
          model: 'system.zoomBehavior',
          label: trans('Zoom behavior'),
          options: {
            'gui': trans('Zoom resizes the whole GUI'),
            'editor': trans('Zoom changes the editor font size')
          }
        }
      ],
      [
        {
          type: 'list',
          label: trans('iFrame rendering whitelist'),
          model: 'system.iframeWhitelist',
          deletable: true,
          labels: [trans('Hostname')],
          searchable: true,
          searchLabel: trans('Search for entries …')
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Activate Watchdog polling'),
          model: 'watchdog.activatePolling'
        },
        {
          type: 'number',
          label: trans('Time to wait before writing a file is considered done (in ms)'),
          model: 'watchdog.stabilityThreshold',
          disabled: window.config.get('watchdog.activatePolling') === false
        }
      ]
    ]
  }
}
