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
      fields: [
        {
          type: 'form-text',
          display: 'info',
          contents: trans('The input mode determines how you interact with the editor. We recommend keeping this setting at "Normal". Only choose "Vim" or "Emacs" if you know what this implies.')
        }
      ]
    },
    {
      title: trans('Writing direction'),
      group: PreferencesGroups.Editor,
      help: undefined, // TODO
      fields: [
        // TODO: Add field for LTR/RTL
        {
          type: 'form-text',
          display: 'info',
          contents: 'We are currently planning on re-introducing bidirectional writing support, which will then be configurable here.'
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
        { type: 'separator' },
        {
          type: 'radio',
          label: trans('Choose between preview mode ("WYSIWYG) or raw mode ("WYSIWYM").'),
          model: 'display.renderingMode',
          inline: true,
          options: {
            preview: trans('Preview mode'),
            raw: trans('Raw mode')
          }
        },
        { type: 'separator' },
        {
          type: 'style-group',
          style: 'columns',
          label: trans('When preview mode is active, the following renderers will be enabled:'),
          fields: [
            {
              type: 'checkbox',
              label: trans('Render citations'),
              model: 'display.renderCitations',
              disabled: config.display.renderingMode === 'raw'
            },
            {
              type: 'checkbox',
              label: trans('Render iframes'),
              model: 'display.renderIframes',
              disabled: config.display.renderingMode === 'raw'
            },
            {
              type: 'checkbox',
              label: trans('Render images'),
              model: 'display.renderImages',
              disabled: config.display.renderingMode === 'raw'
            },
            {
              type: 'checkbox',
              label: trans('Render links'),
              model: 'display.renderLinks',
              disabled: config.display.renderingMode === 'raw'
            },
            {
              type: 'checkbox',
              label: trans('Render formulae'),
              model: 'display.renderMath',
              disabled: config.display.renderingMode === 'raw'
            },
            {
              type: 'checkbox',
              label: trans('Render tasks'),
              model: 'display.renderTasks',
              disabled: config.display.renderingMode === 'raw'
            },
            {
              type: 'checkbox',
              label: trans('Hide heading characters'),
              model: 'display.renderHTags',
              disabled: config.display.renderingMode === 'raw'
            },
            {
              type: 'checkbox',
              label: trans('Render emphasis'),
              model: 'display.renderEmphasis',
              disabled: config.display.renderingMode === 'raw'
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
          label: trans('Show line numbers for Markdown files'),
          model: 'editor.showMarkdownLineNumbers'
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
