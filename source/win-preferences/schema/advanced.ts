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
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'

/**
 * Returns all available advanced preferences settings as a two-dimensional
 * array where the first index denotes fieldsets, and the second are the
 * individual controls in there.
 *
 * @return  {Fieldset[]}  The fields
 */
export function getAdvancedFields (config: ConfigOptions): PreferencesFieldset[] {
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
          info: trans('Available variables: %s', '%id, %Y, %y, %M, %D, %W, %h, %m, %s, %o, %X, %uuid4'),
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
      title: trans('File Treatment'),
      group: PreferencesGroups.Advanced,
      help: undefined, // TODO
      fields: [
        {
          type: 'form-text',
          display: 'info',
          contents: trans('Decide where various file types are displayed, and how to open them.')
        },
        {
          type: 'separator'
        },
        {
          type: 'control-grid',
          header: [
            '',
            trans('Display in file manager'),
            trans('Display in sidebar'),
            trans('Open with'),
          ],
          rows: [
            /* First row: Built-in Markdown and code files, to show how it's supposed to work */
            [
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('Built-in Markdown and Code files')
              },
              {
                type: 'checkbox',
                disabled: true,
                model: 'files.builtin.showInFilemanager'
              },
              {
                type: 'checkbox',
                disabled: true,
                model: 'files.builtin.showInSidebar'
              },
              {
                type: 'form-text',
                display: 'plain',
                contents: 'Zettlr'
              }
            ],
            // Image files
            [
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('Images')
              },
              {
                type: 'checkbox',
                model: 'files.images.showInFilemanager'
              },
              {
                type: 'checkbox',
                model: 'files.images.showInSidebar'
              },
              {
                type: 'select',
                options: {
                  'zettlr': 'Zettlr',
                  'system': trans('System default')
                },
                model: 'files.images.openWith'
              }
            ],
            /* PDF files */
            [
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('PDF documents')
              },
              {
                type: 'checkbox',
                model: 'files.pdf.showInFilemanager'
              },
              {
                type: 'checkbox',
                model: 'files.pdf.showInSidebar'
              },
              {
                type: 'select',
                options: {
                  'zettlr': 'Zettlr',
                  'system': trans('System default')
                },
                model: 'files.pdf.openWith'
              }
            ],
            // Office documents
            [
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('MS Office Documents')
              },
              {
                type: 'checkbox',
                model: 'files.msoffice.showInFilemanager'
              },
              {
                type: 'checkbox',
                model: 'files.msoffice.showInSidebar'
              },
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('System default')
              }
            ],
            // Open Office documents
            [
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('Open Office Documents')
              },
              {
                type: 'checkbox',
                model: 'files.openOffice.showInFilemanager'
              },
              {
                type: 'checkbox',
                model: 'files.openOffice.showInSidebar'
              },
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('System default')
              }
            ],
            // Data files (tsv, csv, etc.)
            [
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('Data files (tsv, csv, etc.)')
              },
              {
                type: 'checkbox',
                model: 'files.dataFiles.showInFilemanager'
              },
              {
                type: 'checkbox',
                model: 'files.dataFiles.showInSidebar'
              },
              {
                type: 'form-text',
                display: 'plain',
                contents: trans('System default')
              }
            ]
          ]
        },
        {
          type: 'separator'
        },
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
          label: trans('Activate watchdog polling'),
          model: 'watchdog.activatePolling'
        },
        {
          type: 'number',
          label: trans('Time to wait before writing a file is considered done (in ms)'),
          model: 'watchdog.stabilityThreshold',
          disabled: !config.watchdog.activatePolling
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
          label: trans('Delete items irreversibly if moving them to trash fails'),
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
