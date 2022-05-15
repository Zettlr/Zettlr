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

export default function (): any {
  return {
    fieldsets: [
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showOpenPreferencesButton'),
          model: 'displayToolbarButtons.showOpenPreferencesButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showNewFileButton'),
          model: 'displayToolbarButtons.showNewFileButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showPreviousFileButton'),
          model: 'displayToolbarButtons.showPreviousFileButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showNextFileButton'),
          model: 'displayToolbarButtons.showNextFileButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showToggleReadabilityButton'),
          model: 'displayToolbarButtons.showToggleReadabilityButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownCommentButton'),
          model: 'displayToolbarButtons.showMarkdownCommentButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownLinkButton'),
          model: 'displayToolbarButtons.showMarkdownLinkButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownImageButton'),
          model: 'displayToolbarButtons.showMarkdownImageButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownMakeTaskListButton'),
          model: 'displayToolbarButtons.showMarkdownMakeTaskListButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showInsertTableButton'),
          model: 'displayToolbarButtons.showInsertTableButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showInsertFootnoteButton'),
          model: 'displayToolbarButtons.showInsertFootnoteButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showDocumentInfoText'),
          model: 'displayToolbarButtons.showDocumentInfoText'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showPomodoroButton'),
          model: 'displayToolbarButtons.showPomodoroButton'
        }
      ]
    ]
  }
}
