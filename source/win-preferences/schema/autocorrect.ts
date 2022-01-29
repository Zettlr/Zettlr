/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AutoCorrect Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the AutoCorrect tab schema.
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
          label: trans('dialog.preferences.autocorrect.active_label'),
          model: 'editor.autoCorrect.active'
        }
      ],
      [
        {
          type: 'radio',
          model: 'editor.autoCorrect.style',
          options: {
            'Word': trans('dialog.preferences.autocorrect.style_word_label'),
            'LibreOffice': trans('dialog.preferences.autocorrect.style_libre_office_label')
          }
        }
      ],
      [
        // Taken from: https://de.wikipedia.org/wiki/Anf%C3%BChrungszeichen
        // ATTENTION when adding new pairs: They will be SPLIT using the hyphen character!
        {
          type: 'select',
          label: trans('dialog.preferences.autocorrect.quotes_double_label'),
          model: 'editor.autoCorrect.magicQuotes.primary',
          options: {
            '"…"': trans('dialog.preferences.autocorrect.quick_select_none_label'),
            '“…”': '“…”',
            '”…”': '”…”',
            '„…“': '„…“',
            '„…”': '„…”',
            '“…„': '“…„',
            '“ … ”': '“ … ”',
            '»…«': '»…«',
            '«…»': '«…»',
            '»…»': '»…»',
            '‘…’': '‘…’',
            '« … »': '« … »',
            '「…」': '「…」',
            '『…』': '『…』'
          }
        },
        {
          type: 'select',
          label: trans('dialog.preferences.autocorrect.quotes_single_label'),
          model: 'editor.autoCorrect.magicQuotes.secondary',
          options: {
            '\'…\'': trans('dialog.preferences.autocorrect.quick_select_none_label'),
            '‘…’': '‘…’',
            '’…’': '’…’',
            '‚…‘': '‚…‘',
            '‚…’': '‚…’',
            '‘…‚': '‘…‚',
            '‘ … ’': '‘ … ’',
            '›…‹': '›…‹',
            '‹…›': '‹…›',
            '›…›': '›…›',
            '‹ … ›': '‹ … ›',
            '«…»': '«…»',
            '„…“': '„…“',
            '„…”': '„…”',
            '「…」': '「…」',
            '『…』': '『…』'
          }
        }
      ],
      [
        {
          type: 'list',
          label: trans('dialog.preferences.autocorrect.replacement_info'),
          model: 'editor.autoCorrect.replacements',
          deletable: true,
          searchable: true,
          addable: true,
          editable: true // All columns may be edited
        }
      ]
    ]
  }
}
