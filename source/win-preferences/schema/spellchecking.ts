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
import { mapLangCodeToName, resolveLangCode } from '@common/util/map-lang-code'
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'

export function getSpellcheckingFields (config: ConfigOptions): PreferencesFieldset[] {
  return [
    {
      title: trans('LanguageTool'),
      infoString: trans('Turning this setting on will send your texts to LanguageTool. The default are the official servers, but you can also self-host the software.'),
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
          disabled: !config.editor.lint.languageTool.active
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
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Preferred Variants')
        },
        {
          type: 'form-text',
          display: 'info',
          contents: trans('LanguageTool cannot distinguish certain language\'s variants. These settings will nudge LanguageTool to auto-detect your preferred variant of these languages.')
        },
        {
          type: 'select',
          model: 'editor.lint.languageTool.variants.en',
          label: trans('Interpret English as'),
          options: {
            'en-US': resolveLangCode('en-US', 'flag') + ' ' + resolveLangCode('en-US'),
            'en-GB': resolveLangCode('en-GB', 'flag') + ' ' + resolveLangCode('en-GB'),
            'en-AU': resolveLangCode('en-AU', 'flag') + ' ' + resolveLangCode('en-AU'),
            'en-CA': resolveLangCode('en-CA', 'flag') + ' ' + resolveLangCode('en-CA'),
            'en-NZ': resolveLangCode('en-NZ', 'flag') + ' ' + resolveLangCode('en-NZ'),
            'en-ZA': resolveLangCode('en-ZA', 'flag') + ' ' + resolveLangCode('en-ZA')
          }
        },
        {
          type: 'select',
          model: 'editor.lint.languageTool.variants.de',
          label: trans('Interpret German as'),
          options: {
            'de-DE': resolveLangCode('de-DE', 'flag') + ' ' + resolveLangCode('de-DE'),
            'de-AT': resolveLangCode('de-AT', 'flag') + ' ' + resolveLangCode('de-AT'),
            'de-CH': resolveLangCode('de-CH', 'flag') + ' ' + resolveLangCode('de-CH')
          }
        },
        {
          type: 'select',
          model: 'editor.lint.languageTool.variants.pt',
          label: trans('Interpret Portuguese as'),
          options: {
            'pt-PT': resolveLangCode('pt-PT', 'flag') + ' ' + resolveLangCode('pt-PT'),
            'pt-BR': resolveLangCode('pt-BR', 'flag') + ' ' + resolveLangCode('pt-BR'),
            'pt-AO': resolveLangCode('pt-AO', 'flag') + ' ' + resolveLangCode('pt-AO'),
            'pt-MZ': resolveLangCode('pt-MZ', 'flag') + ' ' + resolveLangCode('pt-MZ')
          }
        },
        {
          type: 'select',
          model: 'editor.lint.languageTool.variants.ca',
          label: trans('Interpret Catalan as'),
          options: {
            'ca-ES': resolveLangCode('ca-ES', 'flag') + ' ' + resolveLangCode('ca-ES'),
            'ca-ES-valencia': resolveLangCode('ca-ES-valencia', 'flag') + ' ' + resolveLangCode('ca-ES-valencia')
          }
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
          disabled: !config.editor.lint.languageTool.active
        },
        {
          type: 'text',
          label: trans('Custom server address'),
          placeholder: 'https://api.languagetoolplus.com',
          model: 'editor.lint.languageTool.customServer',
          disabled: config.editor.lint.languageTool.provider !== 'custom'
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
          disabled: !config.editor.lint.languageTool.active || config.editor.lint.languageTool.provider === 'custom'
        },
        {
          type: 'text',
          label: trans('LanguageTool API key'),
          model: 'editor.lint.languageTool.apiKey',
          placeholder: 'API key',
          disabled: !config.editor.lint.languageTool.active || config.editor.lint.languageTool.provider === 'custom'
        }
      ]
    },
    {
      title: trans('LanguageTool: Ignored rules'),
      group: PreferencesGroups.Spellchecking,
      help: undefined, // TODO
      fields: [
        {
          type: 'list',
          valueType: 'record',
          keyNames: [ 'name', 'id', 'category' ],
          columnLabels: [ trans('Name'), trans('Rule ID'), trans('Category') ],
          label: trans('These are LanguageTool rules that you have disabled. You can re-enable them here.'),
          model: 'editor.lint.languageTool.ignoredRules',
          deletable: true,
          deleteLabel: trans('Re-enable'),
          editable: false,
          searchable: true,
          searchLabel: trans('Filter'),
          striped: true,
          emptyMessage: trans('No ignored rules.')
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
