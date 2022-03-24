/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        OpenAttachment command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command attempts to open a PDF using Zotero or
 *                  the provided BibTex attachments, if applicable.
 *                  It will fall back to any attachment, in case there
 *                  is no PDF available (such as Blogposts, which only
 *                  provide snapshots).
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { trans } from '@common/i18n-main'
import got from 'got'
import { shell } from 'electron'
import pdfSorter from '@common/util/sort-by-pdf'

export default class OpenAttachment extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'open-attachment')
  }

  /**
   * Attempt to open a PDF (or other) attachment for a given citekey.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing the citekey to open.
   */
  async run (evt: string, arg: any): Promise<boolean> {
    if (!('citekey' in arg) || typeof arg.citekey !== 'string') {
      return false
    }

    let appearsToHaveNoAttachments = false

    // First let's see if we've got BibTex attachments, so we can
    // circumvent the Zotero thing directly
    if (this._app.citeproc.hasBibTexAttachments()) {
      const attachments = this._app.citeproc.getBibTexAttachments(arg.citekey)
      if (attachments === false || attachments.length === 0) {
        appearsToHaveNoAttachments = true
      } else {
        const potentialError = await shell.openPath(attachments[0])
        if (potentialError !== '') {
          this._app.log.warning('Error during opening of BibTex attachment', potentialError)
          return false
        }
        return true
      }
    }

    // Thanks to @retorquere, we can query the better bibtex JSON RPC
    // api to retrieve a full list of all attachments.
    try {
      const res: any = await got.post('http://localhost:23119/better-bibtex/json-rpc', {
        'json': {
          'jsonrpc': '2.0',
          'method': 'item.attachments',
          'params': [arg.citekey]
        }
      }).json()

      if (res.result.length === 0) {
        appearsToHaveNoAttachments = true
      }

      // Now map the result set. It will contain ALL attachments.
      let allAttachments = res.result.map((elem: any) => elem.path)
      // Sort them with PDFs on top
      allAttachments = allAttachments.sort(pdfSorter)
      const potentialError = await shell.openPath(allAttachments[0])
      if (potentialError !== '') {
        throw new Error(potentialError)
      }
      return true
    } catch (err: any) {
      if (appearsToHaveNoAttachments) {
        // Better error message
        let msg = trans('system.error.citation_no_attachments', arg.citekey)
        this._app.log.info(msg)
        this._app.notifications.show(msg)
      } else {
        this._app.log.error('Could not open attachment.', err.message)
        this._app.notifications.show(trans('system.error.open_attachment_error'))
      }
      return false
    }
  }
}
