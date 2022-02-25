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

export default function (): any {
  return {
    fieldsets: [
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.formatting_characters_explanation'),
          model: 'editor.boldFormatting',
          options: {
            '**': '**' + trans('gui.formatting.bold') + '**',
            '__': '__' + trans('gui.formatting.bold') + '__'
          }
        },
        {
          type: 'radio',
          model: 'editor.italicFormatting',
          options: {
            '*': '*' + trans('gui.formatting.italic') + '*',
            '_': '_' + trans('gui.formatting.italic') + '_'
          }
        }
      ],
      [
        {
          type: 'radio',
          label: trans('dialog.preferences.auto_save.label'),
          model: 'editor.autoSave',
          options: {
            'off': trans('dialog.preferences.auto_save.off'),
            'immediately': trans('dialog.preferences.auto_save.immediately'),
            'delayed': trans('dialog.preferences.auto_save.delayed')
          }
        }
      ],
      [
        {
          type: 'text',
          label: trans('dialog.preferences.default_image_save_path'),
          model: 'editor.defaultSaveImagePath'
        },
        {
          type: 'number',
          label: trans('dialog.preferences.indent_unit'),
          model: 'editor.indentUnit'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.indent_with_tabs'),
          model: 'editor.indentWithTabs'
        },
        {
          type: 'number',
          label: trans('dialog.preferences.editor_font_size'),
          model: 'editor.fontSize'
        },
        {
          type: 'select',
          label: trans('dialog.preferences.readability_algorithm'),
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
          label: trans('dialog.preferences.input_mode'),
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
          label: trans('dialog.preferences.mute_lines'),
          model: 'muteLines'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.auto_close_brackets'),
          model: 'editor.autoCloseBrackets'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.autocomplete_accept_space'),
          model: 'editor.autocompleteAcceptSpace'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.homeEndBehaviour'),
          model: 'editor.homeEndBehaviour'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.enable_table_helper'),
          model: 'editor.enableTableHelper'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.count_chars'),
          model: 'editor.countChars'
        }
      ],
      [
        {
          type: 'radio',
          label: '', // TODO
          model: 'editor.direction',
          options: {
            'ltr': trans('dialog.preferences.editor_setting.direction_ltr'),
            'rtl': trans('dialog.preferences.editor_setting.direction_rtl')
          }
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.editor_setting.rtl_move_visually'),
          model: 'editor.rtlMoveVisually'
        }
      ]
    ]
  }
}
