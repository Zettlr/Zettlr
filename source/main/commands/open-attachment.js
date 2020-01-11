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

const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')
const got = require('got')
const { shell } = require('electron')
const pdfSorter = require('../../common/util/sort-by-pdf')

class OpenAttachment extends ZettlrCommand {
  constructor (app) {
    super(app, 'open-attachment')
  }

  /**
   * Create a new directory.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing the citekey to open.
   */
  async run (evt, arg) {
    if (!arg.citekey || typeof arg.citekey !== 'string') return false

    // First let's see if we've got BibTex attachments, so we can
    // circumvent the Zotero thing directly
    if (global.citeproc.hasBibTexAttachments()) {
      let attachments = global.citeproc.getBibTexAttachments(arg.citekey)
      if (attachments) {
        return shell.openItem(attachments[0])
      } // Else: Try Zotero
    }

    // Thanks to @retorquere, we can query the better bibtex JSON RPC
    // api to retrieve a full list of all attachments.
    try {
      let res = await got.post('http://localhost:23119/better-bibtex/json-rpc', {
        'json': {
          'jsonrpc': '2.0',
          'method': 'item.attachments',
          'params': [arg.citekey]
        }
      }).json()
      // Now map the result set. It will contain ALL attachments.
      let allAttachments = res.result.map(elem => elem.path)
      // Sort them with PDFs on top
      allAttachments = allAttachments.sort(pdfSorter)
      return shell.openItem(allAttachments[0])
    } catch (err) {
      global.log.error('Could not open attachment.', err.message)
      global.ipc.notify(trans('system.error.open_attachment_error'))
      return false
    }
  }
}

module.exports = OpenAttachment
