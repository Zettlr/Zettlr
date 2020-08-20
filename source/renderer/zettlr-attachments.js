/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrAttachments class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays the attachments of the current directory.
 *
 * END HEADER
 */
const { renderTemplate } = require('./util/template')

const { shell } = require('electron')

const { trans } = require('../common/lang/i18n.js')
const clarityIcons = require('@clr/icons').ClarityIcons
const Citr = require('@zettlr/citr')

const path = require('path')

const FILETYPES_IMG = [
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.png',
  '.tiff',
  '.tif'
]

/**
  * Handles both display of files in the attachment sidebar and the list of
  * references, if applicable.
  * @param {ZettlrRenderer} parent The renderer.
  */
class ZettlrAttachments {
  constructor (parent) {
    this._renderer = parent
    this._open = false
    this._attachments = []

    this._act() // Activate both the directory toggle and the link
  }

  get container () {
    if (!this._container) {
      this._container = renderTemplate(`<div id="attachments">
  <h1>${trans('gui.attachments')} <clr-icon shape="folder" class="is-solid" id="open-dir-external" title="${trans('gui.attachments_open_dir')}"></clr-icon></h1>
  <div id="files">
    <p>${trans('gui.no_attachments')}</p>
  </div>
  <h1>${trans('gui.citeproc.references_heading')}</h1>
  <div id="bibliography">
    <p>${trans('gui.citeproc.references_none')}</p>
  </div>
</div>`)
      document.querySelector('body').append(this._container)
    }

    return document.getElementById('attachments')
  }

  get fileContainer () {
    return document.getElementById('files')
  }

  get bibliographyContainer () {
    return document.getElementById('bibliography')
  }

  /**
    * Shows/hides the pane.
    */
  toggle () {
    // Toggles the display of the attachment pane
    this._open = !this._open
    this.container.classList.toggle('open', this._open)
  }

  /**
    * Refreshes the list with new attachments on dir change.
    */
  refresh () {
    if (!this.fileContainer) {
      // DOM is not ready
      return
    }
    this.fileContainer.textContent = ''
    // Grab the newest attachments and refresh
    if (!this._renderer.getCurrentDir()) {
      this.fileContainer.append(renderTemplate(`<p>${trans('gui.no_attachments')}</p>`))
      return // Don't activate in this instance
    }

    if (this._renderer.getCurrentDir().attachments.length === 0) {
      this.fileContainer.append(renderTemplate(`<p>${trans('gui.no_attachments')}</p>`))
    } else {
      this._attachments = this._renderer.getCurrentDir().attachments
      let fileExtIcon = clarityIcons.get('file-ext')
      for (let a of this._attachments) {
        let svg = ''
        if (fileExtIcon) svg = fileExtIcon.replace('EXT', path.extname(a.path).slice(1, 4))

        let link = $('<a>').html(svg + ' ' + a.name)
          .attr('class', 'attachment')
          .attr('data-link', a.path)
          .attr('data-hash', a.hash)
          .attr('title', a.path) // Make sure the user can always see the full title
          .attr('href', a.path) // Necessary for native drag&drop functionality

        // When dragging files from here onto the editor instance, users want
        // to have the appropriate link placed automatically, that is: images
        // should be wrapped in appropriate image tags, whereas documents
        // should be linked to enable click & open. We have to do this on
        // this end, because when trying to override data during drop it
        // won't work.
        let dragData = a.path
        if (FILETYPES_IMG.includes(a.ext.toLowerCase())) {
          // Override the drag data with a link to the image
          let uri = decodeURIComponent(a.path)
          dragData = `![${a.name}](${uri})`
        } else {
          // Standard file link
          let uri = decodeURIComponent(a.path)
          dragData = `[${a.name}](${uri})`
        }

        // Circumvent the jQuery event wrapping and use native events.
        link[0].ondragstart = (event) => { this.setDragData(dragData, event) }
        this.fileContainer.append(link)
      }
    }
  }

  /**
   * This function refreshes the bibliography settings.
   * @param  {string} doc The contents of a file
   */
  refreshBibliography (doc) {
    // Remove code which does not contain any citeKeys
    doc = doc.replace(/`{1,3}[^`]+`{1,3}/g, '')

    // Now, use Citr to extract all citations and then extract them to valid
    // CSL JSON to be passed to the main process in order to retrieve the
    // correct bibliography.
    let keys = Citr.util.extractCitations(doc).map(e => Citr.parseSingle(e))

    // Unfortunately, parseSingle always returns an array, as one citation may
    // have multiple keys in it, so we have to "flatten" it out.
    let sanitizedKeys = []
    for (let key of keys) sanitizedKeys = sanitizedKeys.concat(key)
    keys = sanitizedKeys

    // Now we can set the bibliography container to whatever we need
    if (keys.length === 0) {
      this.setBibliographyContents(trans('gui.citeproc.references_none'))
      return
    }

    let updateResult = global.citeproc.updateItems(keys.map(e => e.id))

    if (updateResult === true) {
      global.citeproc.makeBibliography() // Trigger a new bibliography build
    } else if (updateResult === 1) { // 1 means booting
      this.setBibliographyContents(trans('gui.citeproc.references_booting'))
    } else if (updateResult === 3) { // There was an error
      this.setBibliographyContents(trans('gui.citeproc.references_error'))
    } else if (updateResult === 2) { // No database loaded
      this.setBibliographyContents(trans('gui.citeproc.no_db'))
    }
  }

  /**
   * Sets the actual HTML contents of the bibliography container.
   */
  setBibliographyContents (bib) {
    if (!this.bibliographyContainer) {
      // DOM is not ready; Clarity custom elements are not loaded.
      return
    }
    if (typeof bib === 'string') {
      this.bibliographyContainer.innerHTML = `<p>${bib}</p>`
      return
    }
    // Convert links, so that they remain but do not open in the same
    // window. Security fallback: target="_blank" (then at least they "only"
    // open a new window)
    let aRE = /<a(.+?)>(.*?)<\/a>/g
    let output = []
    for (let entry of bib[1]) {
      aRE.lastIndex = 0
      output.push(
        entry.replace(aRE, function (match, p1, p2, offset, string) {
          return `<a${p1} onclick="(e)=>{e.preventDefault(); require('electron').shell.openExternal(this.getAttribute('href')); return false;}" target="_blank">${p2}</a>`
        })
      )
    }
    this.bibliographyContainer.innerHTML = bib[0].bibstart + output.join('\n') + bib[0].bibend
  }

  /**
   * Overwrites the text buffer of a DragEvent to modify what is being dragged.
   * @param {String} data The data to be written into the buffer
   * @param {DragEvent} event The drag event, whose buffer should be overwritten
   */
  setDragData (data, event) {
    event.dataTransfer.setData('text', data)
  }

  /**
    * Activates the event listeners on the attachment pane.
    */
  _act () {
    $('#attachments').on('click', 'a', (e) => {
      let elem = $(e.target)
      if (elem.attr('data-link')) {
        shell.openPath(elem.attr('data-link'))
          .then(potentialError => {
            if (potentialError !== '') {
              console.error('Could not open attachment:' + potentialError)
            }
          })
      } else {
        // Handle links generated by bib data (ie URLs or DOIs)
        shell.openExternal(elem.attr('href'))
      }
      e.preventDefault() // Don't follow the link
      e.stopPropagation()
    })

    $('#attachments #open-dir-external').click((e) => {
      if (this._renderer.getCurrentDir()) {
        shell.openPath(this._renderer.getCurrentDir().path)
          .then(potentialError => {
            if (potentialError !== '') {
              console.error('Could not open attachment:' + potentialError)
            }
          })
      }
    })
  }
}

module.exports = ZettlrAttachments
