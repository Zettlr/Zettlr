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
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getSnippetsFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Snippets'),
      group: PreferencesGroups.Snippets,
      help: '', // TODO
      fields: [] // TODO: Add one button "Open snippets editor"
    }
  ]
}
