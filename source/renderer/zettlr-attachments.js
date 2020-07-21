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

    this._container = document.createElement('div')
    this._container.setAttribute('id', 'attachments')
    this._container.classList.add('hidden')
    this._container.innerHTML = `<h1>${trans('gui.attachments')} <clr-icon shape="folder" class="is-solid" id="open-dir-external" title="${trans('gui.attachments_open_dir')}"></clr-icon></h1>`

    this._fileContainer = document.createElement('div')
    this._fileContainer.setAttribute('id', 'files')

    this._bibliographyContainer = document.createElement('div')
    this._bibliographyContainer.setAttribute('id', 'bibliography')

    let referencesHeading = document.createElement('h1')
    referencesHeading.textContent = trans('gui.citeproc.references_heading')

    this._container.appendChild(this._fileContainer)
    this._container.appendChild(referencesHeading)
    this._container.appendChild(this._bibliographyContainer)

    document.body.appendChild(this._container)

    this._attachments = []

    this._act() // Activate both the directory toggle and the link
  }

  /**
    * Shows/hides the pane.
    */
  toggle () {
    // Toggles the display of the attachment pane
    this._container.classList.toggle('hidden')
  }

  /**
    * Refreshes the list with new attachments on dir change.
    */
  refresh () {
    this._fileContainer.textContent = ''

    // Grab the newest attachments and refresh
    if (!this._renderer.getCurrentDir()) {
      let p = document.createElement('p')
      p.textContent = trans('gui.no_attachments')
      this._fileContainer.appendChild(p)
      return // Don't activate in this instance
    }

    if (this._renderer.getCurrentDir().attachments.length === 0) {
      let p = document.createElement('p')
      p.textContent = trans('gui.no_attachments')
      this._fileContainer.appendChild(p)
    } else {
      this._attachments = this._renderer.getCurrentDir().attachments
      let fileExtIcon = clarityIcons.get('file-ext')
      for (let a of this._attachments) {
        let svg = ''
        if (fileExtIcon) svg = fileExtIcon.replace('EXT', path.extname(a.path).slice(1, 4))

        let link = document.createElement('a')
        link.innerHTML = `${svg} ${a.name}`
        link.setAttribute('data-link', a.path)
        link.setAttribute('data-hash', a.hash)
        link.setAttribute('title', a.path) // Make sure the user can always see the full title
        link.setAttribute('href', a.path) // Necessary for native drag&drop functionality

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
        link.ondragstart = (event) => { this.setDragData(dragData, event) }
        this._fileContainer.appendChild(link)
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
    if (typeof bib === 'string') {
      this._bibliographyContainer.innerHTML = `<p>${bib}</p>`
    } else {
      this._bibliographyContainer.innerHTML = bib[0].bibstart + bib[1].join('\n') + bib[0].bibend
    }
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
    this._container.addEventListener('click', (e) => {
      let a = e.target
      if (a.tagName !== 'A') return // Not an anchor

      if (a.hasAttribute('data-link')) {
        shell.openPath(a.getAttribute('data-link'))
          .then(potentialError => {
            if (potentialError !== '') {
              console.error('Could not open attachment:' + potentialError)
            }
          })
      }

      e.preventDefault() // Don't follow the link
      e.stopPropagation()
    })

    document.getElementById('open-dir-external').addEventListener('click', (e) => {
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
