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
          label: trans('Turn on AutoCorrect'),
          model: 'editor.autoCorrect.active'
        }
      ],
      [
        // Taken from: https://de.wikipedia.org/wiki/Anf%C3%BChrungszeichen
        // ATTENTION when adding new pairs: They will be SPLIT using the hyphen character!
        {
          type: 'select',
          label: trans('Primary Magic Quotes'),
          model: 'editor.autoCorrect.magicQuotes.primary',
          options: {
            '"…"': trans('Disable Magic Quotes'),
            '“…”': '“…” (US primary)',
            '‘…’': '‘…’ (UK primary)',
            '”…”': '”…” (Finnish/Swedish primary)',
            '»…»': '»…» (Finnish/Swedish primary alternative)',
            '„…“': '„…“ (German primary)',
            '»…«': '»…« (German primary alternative)',
            '« … »': '« … » (French primary)',
            '“ … ”': '“ … ” (French primary alternative)',
            '„…”': '„…” (Hungarian/Croatian primary)',
            '“…„': '“…„ (Hebrew/Albanian primary alternative)',
            '«…»': '«…» (Most used primary/Esperanto and Georgian primary alternative)',
            '「…」': '「…」 (Japanese/Taiwanese primary)',
            '『…』': '『…』 (Japanese/Taiwanese primary alternative)'
          }
        },
        {
          type: 'select',
          label: trans('Secondary Magic Quotes'),
          model: 'editor.autoCorrect.magicQuotes.secondary',
          options: {
            '\'…\'': trans('Disable Magic Quotes'),
            '‘…’': '‘…’ (US secondary)',
            '“…”': '“…” (UK secondary)',
            '’…’': '’…’ (Finnish/Swedish secondary)',
            '›…›': '›…› (Swedish secondary alternative)',
            '‚…‘': '‚…‘ (German secondary)',
            '›…‹': '›…‹ (German secondary alternative)',
            '‹ … ›': '‹ … › (French secondary)',
            '‘ … ’': '‘ … ’ (French secondary alternative',
            '‚…’': '‚…’ (Serbian secondary/Dutch secondary alternative)',
            '‹…›': '‹…› (Albanian/Arabic/Swiss Secondary)',
            '‘…‚': '‘…‚ (Albanian secondary alternative)',
            '«…»': '«…» (Rumanian secondary)',
            '„…“': '„…“ (Armenian/Belarussian/Russian/Ukrainian secondary)',
            '„…”': '„…” (Estonian secondary)',
            '『…』': '『…』 (Japanese secondary)',
            '「…」': '「…」 (Korean secondary alternative)'
          }
        }
      ],
      [
        {
          type: 'list',
          label: trans('Here you can define certain strings that will be replaced when AutoCorrect is on. The characters on the left side will be replaced with whatever comes on the right.'),
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
