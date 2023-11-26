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
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

/**
 * Returns all available advanced preferences settings as a two-dimensional
 * array where the first index denotes fieldsets, and the second are the
 * individual controls in there.
 *
 * @return  {Fieldset[]}  The fields
 */
export function getAdvancedFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Pattern for new file names'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
        {
          type: 'text',
          label: trans('Pattern for new filenames'),
          model: 'newFileNamePattern',
          info: 'Variables: %id, %Y, %y, %M, %D, %W, %h, %m, %s, %X, %uuid4',
          group: 'advanced'
        },
        {
          type: 'checkbox',
          label: trans('Do not prompt for filename when creating new files'),
          model: 'newFileDontPrompt',
          group: 'advanced'
        }
      ]
    },
    {
      title: trans('Appearance'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Use native window appearance'),
          model: 'window.nativeAppearance',
          disabled: process.platform !== 'linux'
        },
        {
          type: 'checkbox',
          label: trans('Enable window vibrancy'),
          model: 'window.vibrancy',
          disabled: process.platform !== 'darwin'
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
          type: 'radio',
          model: 'system.zoomBehavior',
          label: trans('Zoom behavior'),
          options: {
            gui: trans('Zoom resizes the whole GUI'),
            editor: trans('Zoom changes the editor font size')
          }
        }
      ]
    },
    {
      title: trans('Attachments sidebar'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
        {
          type: 'token',
          label: trans('Enter all file extensions that you want to see in your attachment sidebar. Separate them with a comma. Changes are recognised after a restart.'),
          model: 'attachmentExtensions'
        }
      ]
    },
    {
      title: trans('Iframe rendering whitelist'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
        {
          type: 'list',
          valueType: 'simpleArray',
          label: trans('iFrame rendering whitelist'),
          model: 'system.iframeWhitelist',
          deletable: true,
          columnLabels: [trans('Hostname')],
          searchable: true,
          searchLabel: trans('Search for entries …')
        }
      ]
    },
    {
      title: trans('Watchdog polling'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
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
    },
    {
      title: trans('Deleting items'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Delete items irreversibly, if moving them to trash fails'),
          model: 'system.deleteOnFail'
        }
      ]
    },
    {
      title: trans('Debug mode'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Enable debug mode'),
          model: 'debug',
          group: 'advanced'
        }
      ]
    },
    {
      title: trans('Beta releases'),
      group: PreferencesGroups.Advanced,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Notify me about beta releases'),
          model: 'checkForBeta'
        }
      ]
    }
  ]
}
