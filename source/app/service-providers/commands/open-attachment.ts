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
import { getBibliographyForDescriptor as getBibliography } from '@common/util/get-bibliography-for-descriptor'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import path from 'path'
import type { MDFileDescriptor } from '@dts/common/fsal'
import { showNativeNotification } from '@common/util/show-notification'
import type { AppServiceContainer } from 'source/app/app-service-container'

// This function overwrites the getBibliographyForDescriptor function to ensure
// the library is always absolute. We have to do it this ridiculously since the
// function is called in both main and renderer processes, and we still have the
// issue that path-browserify is entirely unusable.
function getBibliographyForDescriptor (descriptor: MDFileDescriptor): string {
  const library = getBibliography(descriptor)

  if (library !== CITEPROC_MAIN_DB && !path.isAbsolute(library)) {
    return path.resolve(descriptor.dir, library)
  } else {
    return library
  }
}

export default class OpenAttachment extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
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

    const descriptor = this._app.workspaces.find(arg.filePath)
    if (descriptor === undefined || descriptor.type !== 'file') {
      return false
    }
    const library = getBibliographyForDescriptor(descriptor)

    let appearsToHaveNoAttachments = false

    // First let's see if we've got BibTex attachments, so we can
    // circumvent the Zotero thing directly
    if (this._app.citeproc.hasBibTexAttachments(library)) {
      const attachments = this._app.citeproc.getBibTexAttachments(library, arg.citekey)
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
      // NOTE: We have replaced localhost with 127.0.0.1 since at some point
      // either got or Electron stopped resolving localhost there, resulting in
      // ECONNREFUSED errors. I have no idea how that happened, but it works now.
      const res: any = await got.post('http://127.0.0.1:23119/better-bibtex/json-rpc', {
        json: {
          jsonrpc: '2.0',
          method: 'item.attachments',
          // NOTE: The second parameter means that we wish to search across all
          // libraries (not just the user library, but all groups, too). This
          // allows Zettlr to retrieve items that have been exported from a
          // group library, too.
          // See BBT docs: https://retorque.re/zotero-better-bibtex/exporting/json-rpc/index.html
          // See issue #5647
          params: [ arg.citekey, '*' ]
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
        let msg = trans('The reference with key %s does not appear to have attachments.', arg.citekey)
        this._app.log.info(msg)
        showNativeNotification(msg)
      } else {
        this._app.log.error(`Could not open attachment: ${err.message as string}`, err)
        showNativeNotification(trans('Could not open attachment. Is Zotero running?'))
      }
      return false
    }
  }
}
