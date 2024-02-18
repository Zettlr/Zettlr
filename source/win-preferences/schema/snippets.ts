/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Export Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the export tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import { ProgrammaticallyOpenableWindows } from '@providers/commands/open-aux-window'
const ipcRenderer = window.ipc

export function getSnippetsFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Snippets'),
      group: PreferencesGroups.Snippets,
      help: undefined, // TODO
      fields: [
        {
          type: 'button',
          label: trans('Open snippets editor'),
          onClick: () => {
            ipcRenderer.invoke('application', {
              command: 'open-aux-window',
              payload: {
                window: ProgrammaticallyOpenableWindows.AssetsWindow,
                hash: 'tab-snippets-control'
              }
            })
              .catch(err => console.error(err))
          }
        }
      ]
    }
  ]
}
