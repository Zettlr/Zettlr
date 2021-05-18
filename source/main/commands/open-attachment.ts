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
import { trans } from '../../common/i18n'
import got from 'got'
import { shell } from 'electron'
import pdfSorter from '../../common/util/sort-by-pdf'

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
    if (!arg.citekey || typeof arg.citekey !== 'string') {
      return false
    }

    let appearsToHaveNoAttachments = false

    // First let's see if we've got BibTex attachments, so we can
    // circumvent the Zotero thing directly
    if (global.citeproc.hasBibTexAttachments()) {
      let attachments = global.citeproc.getBibTexAttachments(arg.citekey)
      if (attachments && attachments.length === 0) {
        appearsToHaveNoAttachments = true
      } else if (attachments) {
        let potentialError = await shell.openPath(attachments[0])
        if (potentialError !== '') {
          global.log.warning('Error during opening of BibTex attachment', potentialError)
          return false
        }
        return true
      } else {
        // Try Zotero, but indicate that there might not be attachments
        appearsToHaveNoAttachments = true
      }
    }

    // Thanks to @retorquere, we can query the better bibtex JSON RPC
    // api to retrieve a full list of all attachments.
    try {
      let res: any = await got.post('http://localhost:23119/better-bibtex/json-rpc', {
        'json': {
          'jsonrpc': '2.0',
          'method': 'item.attachments',
          'params': [arg.citekey]
        }
      }).json()
      if (res.result.length === 0) appearsToHaveNoAttachments = true
      // Now map the result set. It will contain ALL attachments.
      let allAttachments = res.result.map((elem: any) => elem.path)
      // Sort them with PDFs on top
      allAttachments = allAttachments.sort(pdfSorter)
      let potentialError = await shell.openPath(allAttachments[0])
      if (potentialError !== '') throw new Error(potentialError)
      return true
    } catch (err) {
      if (appearsToHaveNoAttachments) {
        // Better error message
        let msg = trans('system.error.citation_no_attachments', arg.citekey)
        global.log.info(msg)
        global.notify.normal(msg)
      } else {
        global.log.error('Could not open attachment.', err.message)
        global.notify.normal(trans('system.error.open_attachment_error'))
      }
      return false
    }
  }
}
