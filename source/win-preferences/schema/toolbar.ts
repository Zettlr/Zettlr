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
          label: trans('dialog.preferences.toolbar.markdownCommentButton'),
          model: 'customizeToolbar.showMarkdownCommentButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.markdownLinkButton'),
          model: 'customizeToolbar.showMarkdownLinkButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.markdownImageButton'),
          model: 'customizeToolbar.showMarkdownImageButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.markdownMakeTaskListButton'),
          model: 'customizeToolbar.showMarkdownMakeTaskListButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.insertTableButton'),
          model: 'customizeToolbar.showInsertTableButton'
        }
      ],
      [
        {
          type: 'checkbox',
          label: trans('dialog.preferences.toolbar.insertFootnoteButton'),
          model: 'customizeToolbar.showInsertFootnoteButton'
        }
      ]
    ]
  }
}
