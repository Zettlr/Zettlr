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
import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getEditorFields (): PreferencesFieldset[] {
  return [
    {
      title: trans('Input mode'),
      group: PreferencesGroups.Editor,
      help: '', // TODO
      fields: [
        // TODO: Move select in the title area
        {
          type: 'select',
          label: trans('Editor input mode'),
          model: 'editor.inputMode',
          options: {
            default: 'Normal',
            emacs: 'Emacs',
            vim: 'Vim'
          }
        }
      ]
    },
    {
      title: trans('Writing direction'),
      group: PreferencesGroups.Editor,
      help: '', // TODO
      fields: [
        // TODO: Add field for LTR/RTL
      ]
    },
    {
      title: trans('Markdown rendering'),
      group: PreferencesGroups.Editor,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Render Citations'),
          model: 'display.renderCitations'
        },
        {
          type: 'checkbox',
          label: trans('Render Iframes'),
          model: 'display.renderIframes'
        },
        {
          type: 'checkbox',
          label: trans('Render Images'),
          model: 'display.renderImages'
        },
        {
          type: 'checkbox',
          label: trans('Render Links'),
          model: 'display.renderLinks'
        },
        {
          type: 'checkbox',
          label: trans('Render Formulae'),
          model: 'display.renderMath'
        },
        {
          type: 'checkbox',
          label: trans('Render Tasks'),
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
        },
        { type: 'separator' },
        {
          // TODO: Single element
          type: 'radio',
          label: trans('Choose the formatting characters that the bold/emphasis commands should use'),
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
      help: '', // TODO
      fields: [
        {
          // TODO: Add switch to title area
          type: 'checkbox',
          label: trans('Enable Table Editor'),
          model: 'editor.enableTableHelper'
        }
      ]
    },
    {
      title: trans('Distraction-free mode'),
      group: PreferencesGroups.Editor,
      help: '', // TODO
      fields: [
        {
          type: 'checkbox',
          label: trans('Mute non-focused lines in distraction-free mode'),
          model: 'muteLines'
        },
        {
          type: 'checkbox',
          label: trans('Hide toolbar in distraction free mode'),
          model: 'display.hideToolbarInDistractionFree'
        }
      ]
    },
    {
      title: trans('Word counter'),
      group: PreferencesGroups.Editor,
      help: '', // TODO
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
      help: '', // TODO
      fields: [
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
        }
      ]
    },
    {
      title: trans('Image size'),
      group: PreferencesGroups.Editor,
      help: '', // TODO
      fields: [
        {
          type: 'slider',
          label: trans('Maximum width of images (percent)'),
          min: 0,
          max: 100,
          model: 'display.imageWidth'
        },
        {
          type: 'slider',
          label: trans('Maximum height of images (percent)'),
          min: 0,
          max: 100,
          model: 'display.imageHeight'
        }
      ]
    },
    {
      title: trans('Other settings'),
      group: PreferencesGroups.Editor,
      help: '', // TODO
      fields: [
        {
          type: 'number',
          label: trans('Editor font size'),
          model: 'editor.fontSize'
        },
        { type: 'separator' },
        {
          type: 'number',
          label: trans('Indent by the following number of spaces'),
          model: 'editor.indentUnit'
        },
        {
          // TODO: number+checkbox on the same line
          type: 'checkbox',
          label: trans('Indent using tabs'),
          model: 'editor.indentWithTabs'
        },
        { type: 'separator' },
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
