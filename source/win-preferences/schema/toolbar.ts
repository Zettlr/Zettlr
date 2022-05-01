/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Advanced Preferences Schema
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Exports the advanced tab schema.
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
          label: trans('dialog.preferences.toolbar.showNewFileButton'),
          model: 'customizeToolbar.showNewFileButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showPreviousFileButton'),
          model: 'customizeToolbar.showPreviousFileButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showNextFileButton'),
          model: 'customizeToolbar.showNextFileButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showToggleReadabilityButton'),
          model: 'customizeToolbar.showToggleReadabilityButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownCommentButton'),
          model: 'customizeToolbar.showMarkdownCommentButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownLinkButton'),
          model: 'customizeToolbar.showMarkdownLinkButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownImageButton'),
          model: 'customizeToolbar.showMarkdownImageButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showMarkdownMakeTaskListButton'),
          model: 'customizeToolbar.showMarkdownMakeTaskListButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showInsertTableButton'),
          model: 'customizeToolbar.showInsertTableButton'
        },
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showInsertFootnoteButton'),
          model: 'customizeToolbar.showInsertFootnoteButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.showDocumentInfoText'),
          model: 'customizeToolbar.showDocumentInfoText'
        }
      ]
    ]
  }
}
