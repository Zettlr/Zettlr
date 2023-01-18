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
          type: 'switch',
          label: trans('Use LanguageTool'),
          model: 'editor.lint.languageTool.active'
        },
        {
          type: 'radio',
          label: trans('Strictness'),
          options: {
            'default': trans('Standard'),
            'picky': trans('Picky')
          },
          model: 'editor.lint.languageTool.level',
          disabled: window.config.get('editor.lint.languageTool.active') === false
        },
        {
          type: 'radio',
          label: trans('LanguageTool Provider'),
          options: {
            'official': 'LanguageTool.org',
            'custom': trans('Custom server')
          },
          model: 'editor.lint.languageTool.provider',
          disabled: window.config.get('editor.lint.languageTool.active') === false
        },
        {
          type: 'text',
          label: trans('Custom server'),
          placeholder: 'https://api.languagetoolplus.com',
          model: 'editor.lint.languageTool.customServer',
          disabled: window.config.get('editor.lint.languageTool.provider') !== 'custom'
        },
        {
          type: 'text',
          label: trans('LanguageTool Username'),
          model: 'editor.lint.languageTool.username'
        },
        {
          type: 'text',
          label: trans('LanguageTool API key'),
          model: 'editor.lint.languageTool.apiKey'
        }
      ],
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
