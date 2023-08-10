/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the editor tab schema.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { type FormSchema } from '@common/vue/form/Form.vue'

export default function (): FormSchema {
  return {
    fieldsets: [
      [
        {
          type: 'radio',
          label: trans('Choose the formatting characters that the bold/emphasis commands should use'),
          model: 'editor.boldFormatting',
          options: {
            '**': '**' + trans('Bold') + '**',
            '__': '__' + trans('Bold') + '__'
          }
        },
        {
          type: 'radio',
          model: 'editor.italicFormatting',
          options: {
            '*': '*' + trans('Italics') + '*',
            '_': '_' + trans('Italics') + '_'
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('Autosave'),
          model: 'editor.autoSave',
          options: {
            'off': trans('Off'),
            'immediately': trans('Immediately'),
            'delayed': trans('After a short delay')
          }
        }
      ],
      [
        {
          type: 'text',
          label: trans('Default image path (relative or absolute)'),
          model: 'editor.defaultSaveImagePath'
        },
        {
          type: 'number',
          label: trans('Indent by the following number of spaces'),
          model: 'editor.indentUnit'
        },
        {
          type: 'checkbox',
          label: trans('Indent using tabs'),
          model: 'editor.indentWithTabs'
        },
        {
          type: 'number',
          label: trans('Editor font size'),
          model: 'editor.fontSize'
        },
        {
          type: 'select',
          label: trans('Algorithm to use for the readability mode'),
          model: 'editor.readabilityAlgorithm',
          options: {
            'dale-chall': 'Dale-Chall',
            'gunning-fog': 'Gunning-Fog',
            'coleman-liau': 'Coleman/Liau',
            'automated-readability': 'Automated Readability Index (ARI)'
          }
        },
        {
          type: 'select',
          label: trans('Editor input mode'),
          model: 'editor.inputMode',
          options: {
            'default': 'Normal',
            'emacs': 'Emacs',
            'vim': 'Vim'
          }
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Check Markdown for style issues'),
          model: 'editor.lint.markdown'
        },
        {
          type: 'checkbox',
          label: trans('Show statusbar'),
          model: 'editor.showStatusbar'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Mute non-focused lines in distraction-free mode'),
          model: 'muteLines'
        },
        {
          type: 'checkbox',
          label: trans('Automatically close matching character pairs'),
          model: 'editor.autoCloseBrackets'
        },
        {
          type: 'checkbox',
          label: trans('Accept spaces during autocompletion'),
          model: 'editor.autocompleteAcceptSpace'
        },
        {
          type: 'checkbox',
          label: trans('Enable Table Editor'),
          model: 'editor.enableTableHelper'
        },
        {
          type: 'checkbox',
          label: trans('Show link previews'),
          model: 'editor.showLinkPreviews'
        },
        {
          type: 'checkbox',
          label: trans('Count characters instead of words (e.g., for Chinese)'),
          model: 'editor.countChars'
        }
      ]
    ]
  } satisfies FormSchema
}
