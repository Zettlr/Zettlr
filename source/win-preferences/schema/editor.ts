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
import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'

export function getEditorFields (config: ConfigOptions): PreferencesFieldset[] {
  // Build input mode fields conditionally based on inputMode selection
  const inputModeFields: any[] = [
    {
      type: 'form-text',
      display: 'info',
      contents: trans('The input mode determines how you interact with the editor. We recommend keeping this setting at "Normal". Only choose "Vim" or "Emacs" if you know what this implies.')
    }
  ]

  // Only show Vim-specific settings when Vim mode is selected
  if (config.editor.inputMode === 'vim') {
    inputModeFields.push({
      type: 'form-text',
      display: 'info',
      contents: trans('Vim commands work automatically with non-Latin keyboards (Arabic, Hebrew, etc.) thanks to physical key mapping. Basic commands (h/j/k/l/w/b) work without any configuration.')
    })

    inputModeFields.push({ type: 'separator' })

    inputModeFields.push({
      type: 'form-text',
      display: 'sub-heading',
      contents: trans('Custom Vim Key Mappings')
    })

    inputModeFields.push({
      type: 'form-text',
      display: 'info',
      contents: trans('Train custom key combinations for Vim commands that require modifier keys on your keyboard layout. For example, on German keyboards "{" requires Alt+8. Click "Key Combination" and press the key combo to train it. This is optional - only needed for special characters.')
    })

    inputModeFields.push({
      type: 'vim-key-mapping-trainer',
      model: 'editor.vimKeyMappings'
    })
  }

  return [
    {
      title: trans('Input mode'),
      group: PreferencesGroups.Editor,
      titleField: {
        type: 'select',
        model: 'editor.inputMode',
        options: {
          default: 'Normal',
          emacs: 'Emacs',
          vim: 'Vim'
        }
      },
      help: undefined, // TODO
      fields: inputModeFields
    },
    {
      title: trans('Writing direction'),
      group: PreferencesGroups.Editor,
      help: undefined,
      fields: [
        {
          type: 'form-text',
          display: 'info',
          contents: trans('Choose the text direction for the editor. "Auto" automatically detects the direction based on document content (recommended for mixed-language documents).')
        },
        {
          type: 'select',
          label: trans('Text direction'),
          model: 'editor.textDirection',
          options: {
            'ltr': trans('Left-to-right (LTR)'),
            'rtl': trans('Right-to-left (RTL)'),
            'auto': trans('Auto-detect from content')
          }
        }
      ]
    },
    {
      title: trans('Markdown rendering'),
      group: PreferencesGroups.Editor,
      help: undefined, // TODO
      fields: [
        {
          type: 'form-text',
          display: 'info',
          contents: trans('Check to enable live rendering of various Markdown elements to formatted appearance. This hides formatting characters (such as **text**) or renders images instead of their link.')
        },
        {
          type: 'style-group',
          style: 'columns',
          fields: [
            {
              type: 'checkbox',
              label: trans('Render citations'),
              model: 'display.renderCitations'
            },
            {
              type: 'checkbox',
              label: trans('Render iframes'),
              model: 'display.renderIframes'
            },
            {
              type: 'checkbox',
              label: trans('Render images'),
              model: 'display.renderImages'
            },
            {
              type: 'checkbox',
              label: trans('Render links'),
              model: 'display.renderLinks'
            },
            {
              type: 'checkbox',
              label: trans('Render formulae'),
              model: 'display.renderMath'
            },
            {
              type: 'checkbox',
              label: trans('Render tasks'),
              model: 'display.renderTasks'
            },
            {
              type: 'checkbox',
              label: trans('Hide heading characters'),
              model: 'display.renderHTags'
            },
            {
              type: 'checkbox',
              label: trans('Render emphasis'),
              model: 'display.renderEmphasis'
            }
          ]
        },
        { type: 'separator' },
        {
          type: 'form-text',
          display: 'sub-heading',
          contents: trans('Formatting characters for bold and italics')
        },
        {
          type: 'style-group',
          style: 'columns',
          fields: [
            {
              type: 'radio',
              model: 'editor.boldFormatting',
              options: {
                '**': '**' + trans('Bold') + '**',
                __: '__' + trans('Bold') + '__'
              }
            },
            {
              type: 'radio',
              model: 'editor.italicFormatting',
              options: {
                '*': '*' + trans('Italics') + '*',
                _: '_' + trans('Italics') + '_'
              }
            }
          ]
        },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: trans('Check Markdown for style issues'),
          model: 'editor.lint.markdown'
        }
      ]
    },
    {
      title: trans('Table Editor'),
      group: PreferencesGroups.Editor,
      titleField: {
        type: 'switch',
        model: 'editor.enableTableHelper'
      },
      help: undefined, // TODO
      fields: [
        {
          type: 'form-text',
          display: 'info',
          contents: trans('The Table Editor is an interactive interface that simplifies creation and editing of tables. It provides buttons for common functionality, and takes care of Markdown formatting.')
        }
      ]
    },
    {
      title: trans('Distraction-free mode'),
      group: PreferencesGroups.Editor,
      help: undefined, // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Mute non-focused lines in distraction-free mode'),
          model: 'muteLines'
        },
        {
          type: 'checkbox',
          label: trans('Hide toolbar in distraction-free mode'),
          model: 'display.hideToolbarInDistractionFree'
        }
      ]
    },
    {
      title: trans('Word counter'),
      group: PreferencesGroups.Editor,
      help: undefined, // TODO
      fields: [
        {
          // TODO: Must be radio (Count words/Count characters)
          type: 'checkbox',
          label: trans('Count characters instead of words (e.g., for Chinese)'),
          model: 'editor.countChars'
        }
      ]
    },
    {
      title: trans('Readability mode'),
      group: PreferencesGroups.Editor,
      help: undefined, // TODO
      fields: [
        {
          type: 'select',
          inline: true,
          label: trans('Algorithm'),
          model: 'editor.readabilityAlgorithm',
          options: {
            'dale-chall': 'Dale-Chall',
            'gunning-fog': 'Gunning-Fog',
            'coleman-liau': 'Coleman/Liau',
            'automated-readability': 'Automated Readability Index (ARI)'
          }
        }
      ]
    },
    {
      title: trans('Image size'),
      group: PreferencesGroups.Editor,
      help: undefined, // TODO
      fields: [
        {
          type: 'slider',
          label: trans('Maximum width of images (%s %)', config.display.imageWidth),
          min: 0,
          max: 100,
          model: 'display.imageWidth'
        },
        {
          type: 'slider',
          label: trans('Maximum height of images (%s %)', config.display.imageHeight),
          min: 0,
          max: 100,
          model: 'display.imageHeight'
        }
      ]
    },
    {
      title: trans('Other settings'),
      group: PreferencesGroups.Editor,
      help: undefined, // TODO
      fields: [
        {
          type: 'number',
          label: trans('Font size'),
          inline: true,
          model: 'editor.fontSize'
        },
        { type: 'separator' },
        {
          type: 'number',
          label: trans('Indentation size (number of spaces)'),
          inline: true,
          model: 'editor.indentUnit'
        },
        {
          // TODO: number+checkbox on the same line
          type: 'checkbox',
          label: trans('Indent using tabs instead of spaces'),
          model: 'editor.indentWithTabs'
        },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: trans('Show formatting toolbar when text is selected'),
          model: 'editor.showFormattingToolbar'
        },
        {
          type: 'checkbox',
          label: trans('Highlight whitespace'),
          model: 'editor.showWhitespace'
        },
        {
          // TODO: Where to move this new setting???
          type: 'checkbox',
          label: trans('Suggest emojis during autocompletion'),
          model: 'editor.autocompleteSuggestEmojis'
        },
        {
          type: 'checkbox',
          label: trans('Show link previews'),
          model: 'editor.showLinkPreviews'
        },
        {
          // TODO: Where should this setting go?
          type: 'checkbox',
          label: trans('Automatically close matching character pairs'),
          model: 'editor.autoCloseBrackets'
        }
      ]
    }
  ]
}
