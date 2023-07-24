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
import { mapLangCodeToName } from '@common/util/map-lang-code'
import { type FormSchema } from '@common/vue/form/Form.vue'

export default function (): FormSchema {
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
          type: 'select',
          label: trans('Mother tongue'),
          options: {
            '': trans('Not set'),
            ...mapLangCodeToName()
          },
          model: 'editor.lint.languageTool.motherTongue'
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
          model: 'editor.lint.languageTool.username',
          disabled: window.config.get('editor.lint.languageTool.active') === false || window.config.get('editor.lint.languageTool.provider') === 'custom'
        },
        {
          type: 'text',
          label: trans('LanguageTool API key'),
          model: 'editor.lint.languageTool.apiKey',
          disabled: window.config.get('editor.lint.languageTool.active') === false || window.config.get('editor.lint.languageTool.provider') === 'custom'
        }
      ],
      [
        {
          type: 'list',
          valueType: 'record',
          keyNames: [ 'selected', 'key', 'value' ],
          columnLabels: [ trans('Active'), trans('Language Code'), trans('Name') ],
          label: trans('Select the languages for which you want to enable automatic spell checking.'),
          model: 'availableDictionaries',
          deletable: false,
          editable: [0], // Only the "selectable" column may be edited
          searchable: true,
          searchLabel: trans('Search for dictionaries…'),
          striped: true
        },
        {
          type: 'list',
          valueType: 'simpleArray',
          label: trans('User dictionary. Remove words by clicking them.'),
          model: 'userDictionaryContents',
          columnLabels: [trans('Dictionary entry')],
          deletable: true,
          searchable: true,
          searchLabel: trans('Search for entries …'),
          striped: true
        }
      ]
    ]
  } satisfies FormSchema
}
