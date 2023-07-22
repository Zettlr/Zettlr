/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Toolbar Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Edgar Tang
 * License:         GNU GPL v3
 *
 * Description:     Exports the toolbar tab schema.
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
          type: 'checkbox',
          label: trans('Display "Open Preferences" button'),
          model: 'displayToolbarButtons.showOpenPreferencesButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "New File" button'),
          model: 'displayToolbarButtons.showNewFileButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Previous File" button'),
          model: 'displayToolbarButtons.showPreviousFileButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Next File" button'),
          model: 'displayToolbarButtons.showNextFileButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Display readability button'),
          model: 'displayToolbarButtons.showToggleReadabilityButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert Comment" button'),
          model: 'displayToolbarButtons.showMarkdownCommentButton'
        },
        {
          type: 'checkbox',
          label: trans('Display link button'),
          model: 'displayToolbarButtons.showMarkdownLinkButton'
        },
        {
          type: 'checkbox',
          label: trans('Display image button'),
          model: 'displayToolbarButtons.showMarkdownImageButton'
        },
        {
          type: 'checkbox',
          label: trans('Display task list button'),
          model: 'displayToolbarButtons.showMarkdownMakeTaskListButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert Table" button'),
          model: 'displayToolbarButtons.showInsertTableButton'
        },
        {
          type: 'checkbox',
          label: trans('Display "Insert Footnote" button'),
          model: 'displayToolbarButtons.showInsertFootnoteButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('Display document info'),
          model: 'displayToolbarButtons.showDocumentInfoText'
        },
        {
          type: 'checkbox',
          label: trans('Display Pomodoro-timer'),
          model: 'displayToolbarButtons.showPomodoroButton'
        }
      ]
    ]
  } satisfies FormSchema
}
