import { trans } from '../../common/i18n'

export default {
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
      },
      {
        type: 'list',
        label: 'AutoCorrect',
        model: 'editor.autoCorrect.replacements',
        listOptions: {
          deletable: true,
          isDatatable: true // In this case, the module won't look for options, but take the values for these
        }
      }
    ]
  ]
}
