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
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'

export function getGeneralFields (appLangOptions: Record<string, string>): PreferencesFieldset[] {
  const updateSetting: PreferencesFieldset = {
    title: trans('Updates'),
    infoString: trans('If you installed Zettlr via a package manager, you should disable this.'),
    group: PreferencesGroups.General,
    help: undefined, // TODO
    fields: [
      {
        type: 'checkbox',
        label: trans('Automatically check for updates'),
        model: 'system.checkForUpdates'
      }
    ]
  }

  const updatesDisabledSetting: PreferencesFieldset = {
    title: trans('Updates'),
    group: PreferencesGroups.General,
    infoString: trans('Updates for this binary of Zettlr have been disabled at build time. This is a choice made by the packager and is common when Zettlr is being distributed via package managers. In these cases, Zettlr will be updated through your package manager.'),
    fields: []
  }

  return [
    {
      title: trans('Application language'),
      group: PreferencesGroups.General,
      titleField: {
        type: 'select',
        model: 'appLang',
        options: appLangOptions
      },
      help: undefined, // TODO
      fields: []
    },
    {
      title: trans('Autosave'),
      infoString: trans('Should Zettlr automatically save changes to your documents?'),
      group: PreferencesGroups.General,
      help: undefined, // TODO
      fields: [
        {
          // TODO: Move off to switch in title
          type: 'radio',
          model: 'editor.autoSave',
          inline: true,
          options: {
            off: trans('Never'),
            immediately: trans('Immediately'),
            delayed: trans('After a short delay')
          }
        }
      ]
    },
    {
      title: trans('Default image folder'),
      infoString: trans('Automatically suggests this folder to save images to, and searches this folder to propose "other files".'),
      group: PreferencesGroups.General,
      help: undefined, // TODO
      fields: [
        {
          type: 'directory',
          reset: true,
          model: 'editor.defaultSaveImagePath'
        },
        {
          type: 'form-text',
          display: 'info',
          contents: trans('Click "Select folder…" or type an absolute or relative path directly into the input field.')
        }
      ]
    },
    {
      title: trans('Behavior'),
      group: PreferencesGroups.General,
      help: undefined, // TODO
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
    ...(__UPDATES_DISABLED__ === '0' ? [updateSetting] : [updatesDisabledSetting])
  ]
}
