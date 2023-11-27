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
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getGeneralFields (appLangOptions: Record<string, string>): PreferencesFieldset[] {
  return [
    {
      title: trans('Application language'),
      group: PreferencesGroups.General,
      titleField: {
        type: 'select',
        model: 'appLang',
        options: appLangOptions
      },
      help: '', // TODO
      fields: [
      ]
    },
    {
      title: trans('Autosave'),
      group: PreferencesGroups.General,
      help: '', // TODO
      fields: [
        {
          type: 'separator'
        },
        {
          // TODO: Move off to switch in title
          type: 'radio',
          label: trans('Save modifications'),
          model: 'editor.autoSave',
          inline: true,
          options: {
            off: trans('Off'),
            immediately: trans('Immediately'),
            delayed: trans('After a short delay')
          }
        }
      ]
    },
    {
      title: trans('Default image folder'),
      group: PreferencesGroups.General,
      help: '', // TODO
      fields: [
        {
          type: 'text',
          label: trans('Default image path (relative or absolute)'),
          model: 'editor.defaultSaveImagePath'
        }
      ]
    },
    {
      title: trans('Behavior'),
      group: PreferencesGroups.General,
      help: '', // TODO
      fields: [
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
      ]
    },
    {
      title: trans('Updates'),
      group: PreferencesGroups.General,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Automatically check for updates'),
          model: 'system.checkForUpdates'
        }
      ]
    }
  ]
}
