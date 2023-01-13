/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        fetchLinkPreview command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command fetches a small preview for a link
 *
 * END HEADER
 */

import { fetchLinkPreview, LinkPreviewResult } from '@common/util/fetch-link-preview'
import ZettlrCommand from './zettlr-command'

export default class FetchLinkPreview extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'fetch-link-preview')
  }

  /**
   * Fetches a link preview for a given URL. Returns undefined if any error occurs.
   *
   * @param   {string}                                evt  The event
   * @param   {string}                                arg  The URL
   *
   * @return  {Promise<LinkPreviewResult|undefined>}       The result
   */
  async run (evt: string, arg: string): Promise<LinkPreviewResult|undefined> {
    const { editor } = this._app.config.getConfig()
    if (!editor.showLinkPreviews) {
      return undefined // No link previews wanted
    }

    // Catch a set of links that we can't fetch a preview for
    if (arg.startsWith('mailto')) {
      return undefined
    }

    try {
      return await fetchLinkPreview(arg)
    } catch (err: any) {
      this._app.log.error(`[Application] Could not fetch link preview for URL ${String(arg)}`, err)
      return undefined // Silently swallow errors
    }
  }
}
