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
      help: undefined, // TODO
      fields: [
        {
          type: 'text',
          label: trans('Define a pattern for new file names'),
          model: 'newFileNamePattern',
          info: trans('Available variables: %s', '%id, %Y, %y, %M, %D, %W, %h, %m, %s, %X, %uuid4'),
          reset: '%id.md',
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
      help: undefined, // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Use native window appearance'),
          info: trans('Only available on Linux; this is the default for macOS and Windows.'),
          model: 'window.nativeAppearance',
          disabled: process.platform !== 'linux'
        },
        {
          type: 'checkbox',
          label: trans('Enable window vibrancy'),
          info: trans('Only available on macOS; makes the window background opaque.'),
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
        { type: 'separator' },
        {
          type: 'radio',
          model: 'system.zoomBehavior',
          label: trans('Zoom behavior'),
          inline: true,
          options: {
            gui: trans('Resizes the whole GUI'),
            editor: trans('Changes the editor font size')
          }
        }
      ]
    },
    {
      title: trans('Attachments sidebar'),
      group: PreferencesGroups.Advanced,
      help: undefined, // TODO
      fields: [
        {
          type: 'token',
          label: trans('File extensions to be visible in the Attachments sidebar'),
          model: 'attachmentExtensions'
        }
      ]
    },
    {
      title: trans('Iframe rendering whitelist'),
      group: PreferencesGroups.Advanced,
      help: undefined, // TODO
      fields: [
        {
          type: 'list',
          valueType: 'simpleArray',
          model: 'system.iframeWhitelist',
          deletable: true,
          columnLabels: [trans('Hostname')],
          searchable: true,
          searchLabel: trans('Filter')
        }
      ]
    },
    {
      title: trans('Watchdog polling'),
      group: PreferencesGroups.Advanced,
      help: undefined, // TODO
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
      help: undefined, // TODO
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
      help: undefined, // TODO
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
      help: undefined, // TODO
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
