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
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getSpellcheckingFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('LanguageTool'),
      group: PreferencesGroups.Spellchecking,
      titleField: {
        type: 'switch',
        model: 'editor.lint.languageTool.active'
      },
      help: undefined, // TODO
      fields: [
        {
          type: 'radio',
          label: trans('Strictness'),
          inline: true,
          options: {
            default: trans('Standard'),
            picky: trans('Picky')
          },
          model: 'editor.lint.languageTool.level',
          disabled: window.config.get('editor.lint.languageTool.active') === false
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Mother language')
        },
        {
          type: 'select',
          inline: true,
          options: {
            '': trans('Not set'),
            ...mapLangCodeToName()
          },
          model: 'editor.lint.languageTool.motherTongue'
        },
        { type: 'separator' },
        {
          type: 'radio',
          label: trans('LanguageTool Provider'),
          inline: true,
          options: {
            official: 'LanguageTool.org',
            custom: trans('Custom server')
          },
          model: 'editor.lint.languageTool.provider',
          disabled: window.config.get('editor.lint.languageTool.active') === false
        },
        {
          type: 'text',
          label: trans('Custom server address'),
          placeholder: 'https://api.languagetoolplus.com',
          model: 'editor.lint.languageTool.customServer',
          disabled: window.config.get('editor.lint.languageTool.provider') !== 'custom'
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('LanguageTool Premium')
        },
        {
          type: 'form-text',
          display: 'info',
          contents: trans('Zettlr will ignore the "LanguageTool provider" settings if you enter any credentials here.')
        },
        {
          type: 'text',
          label: trans('LanguageTool Username'),
          model: 'editor.lint.languageTool.username',
          placeholder: 'Username',
          disabled: window.config.get('editor.lint.languageTool.active') === false || window.config.get('editor.lint.languageTool.provider') === 'custom'
        },
        {
          type: 'text',
          label: trans('LanguageTool API key'),
          model: 'editor.lint.languageTool.apiKey',
          placeholder: 'API key',
          disabled: window.config.get('editor.lint.languageTool.active') === false || window.config.get('editor.lint.languageTool.provider') === 'custom'
        }
      ]
    },
    {
      title: trans('Spellchecking'),
      group: PreferencesGroups.Spellchecking,
      help: undefined, // TODO
      fields: [
        // TODO: Add switch to title area later on that doesn#t exist yet
        {
          type: 'list',
          valueType: 'record',
          keyNames: [ 'selected', 'key', 'value' ],
          columnLabels: [ trans('Active'), trans('Language'), trans('Code') ],
          label: trans('Select the languages for which you want to enable automatic spell checking.'),
          model: 'availableDictionaries',
          deletable: false,
          editable: [0], // Only the "selectable" column may be edited
          searchable: true,
          searchLabel: trans('Filter'),
          striped: true
        },
        { type: 'separator' },
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
    }
  ]
}
