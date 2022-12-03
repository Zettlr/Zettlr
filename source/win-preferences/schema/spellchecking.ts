/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Spellchecking Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the spellchecking tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'

export default function (): any {
  return {
    fieldsets: [
      [
        {
          type: 'list',
          label: trans('Select the languages for which you want to enable automatic spell checking.'),
          model: 'availableDictionaries',
          deletable: false,
          editable: [0], // Only the "selectable" column may be edited
          searchable: true,
          searchLabel: trans('Search for dictionaries &hellip;')
        },
        {
          type: 'list',
          label: trans('User dictionary. Remove words by clicking them.'),
          model: 'userDictionaryContents',
          labels: [trans('Dictionary entry')],
          deletable: true,
          searchable: true,
          searchLabel: trans('Search for entries …')
        }
      ]
    ]
  }
}
