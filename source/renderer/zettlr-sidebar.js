/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrSidebar class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Manages the sidebar
 *
 * END HEADER
 */
const renderTemplate = require('./util/render-template')

const { trans } = require('../common/i18n.js')
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
  * Handles both display of files in the sidebar and the list of
  * references, if applicable.
  * @param {ZettlrRenderer} parent The renderer.
  */
module.exports = class ZettlrSidebar {
  constructor (parent) {
    this._renderer = parent

    const tabs = renderTemplate(`
    <div id="sidebar-tabs">
      <div data-target="sidebar-files" class="sidebar-tab active" title="${trans('gui.attachments')}"><clr-icon shape="attachment"></clr-icon></div>
      <div data-target="sidebar-bibliography" class="sidebar-tab" title="${trans('gui.citeproc.references_heading')}"><clr-icon shape="book"></clr-icon></div>
      <div data-target="sidebar-toc" class="sidebar-tab" title="Table of Contents"><clr-icon shape="indented-view-list"></clr-icon></div>
    </div>`)

    // Immediately preset the container element with the necessary structure
    const sidebarContents = renderTemplate(`
    <div id="sidebar-tab-containers">
      <div id="sidebar-files">
        <h1>
        ${trans('gui.attachments')}
          <clr-icon shape="folder" class="is-solid" id="open-dir-external" title="${trans('gui.attachments_open_dir')}"></clr-icon>
        </h1>
        <div id="files">
        <p>${trans('gui.no_attachments')}</p>
        </div>
      </div>
      <div id="sidebar-bibliography" class="hidden">
      <h1>${trans('gui.citeproc.references_heading')}</h1>
        <div id="bibliography">
          <p>${trans('gui.citeproc.references_none')}</p>
        </div>
      </div>
      <div id="sidebar-toc" class="hidden">
        <h1>${trans('gui.table_of_contents')}</h1>
        <div id="sidebar-toc-contents">
        </div>
      </div>
    </div>`)

    document.getElementById('sidebar').appendChild(tabs)
    document.getElementById('sidebar').appendChild(sidebarContents)

    // Enable opening of the directory in Finder/Explorer/linux file browser
    this.openDirButton.addEventListener('click', (e) => {
      if (this._renderer.getCurrentDir() !== null) {
        global.ipc.send('open-external', { href: this._renderer.getCurrentDir().path })
      }
    })

    // Enable the tabs
    const tabLinks = this.tabContainer.querySelectorAll('.sidebar-tab')
    for (let tab of tabLinks) {
      tab.addEventListener('click', (e) => {
        let elem = e.target
        if (elem.tagName === 'CLR-ICON') elem = elem.parentElement

        const target = elem.dataset.target
        const containers = this.tabTargetsContainer.children

        // Apply the correct active class
        for (let link of tabLinks) {
          if (link === tab) {
            link.classList.add('active')
          } else {
            link.classList.remove('active')
          }
        }

        // Show the correct container
        for (let elem of containers) {
          if (elem.getAttribute('id') !== target) {
            elem.classList.add('hidden')
          } else {
            elem.classList.remove('hidden')
          }
        }
      }) // END addEventListener
    } // END for let tab of tabs
  }

  /**
   * Returns the rendered sidebar container.
   *
   * @return  {Element}  The container element.
   */
  get container () {
    return document.getElementById('sidebar')
  }

  /**
   * Returns the tab container
   *
   * @return  {Element}  The sidebar container
   */
  get tabContainer () {
    return document.getElementById('sidebar-tabs')
  }

  /**
   * Get the wrapper of the tab targets
   *
   * @return  {Element}  The DOM element.
   */
  get tabTargetsContainer () {
    return document.getElementById('sidebar-tab-containers')
  }

  /**
   * Returns the directory opening button
   *
   * @return  {Element} The document element.
   */
  get openDirButton () {
    return document.getElementById('open-dir-external')
  }

  /**
   * Returns the file container element
   *
   * @return  {Element}  The file container element.
   */
  get fileContainer () {
    return document.getElementById('files')
  }

  /**
   * Returns the bibliography container element
   *
   * @return  {Element} The DOM element.
   */
  get bibliographyContainer () {
    return document.getElementById('bibliography')
  }

  /**
   * Returns the table of contents container
   *
   * @return  {Element}  The DOM element.
   */
  get tocContainer () {
    return document.getElementById('sidebar-toc-contents')
  }

  /**
    * Shows/hides the pane.
    */
  toggle () {
    // Toggles the display of the sidebar
    this.container.classList.toggle('open')
  }

  /**
   * Creates a renderable DOM element for the given attachment
   *
   * @param   {Object}  attachment  The attachment to be rendered
   * @param   {String}  icon        The SVG icon string
   *
   * @return  {DOMElement}          The rendered DOM element
   */
  createAttachmentElement (attachment, icon) {
    return renderTemplate(
      `<a
        class="attachment"
        draggable="true"
        data-link="${attachment.path}"
        data-hash="${attachment.hash}"
        title="${attachment.path}"
        onclick="global.ipc.send('open-external', { href: '${attachment.path}' })"
      >
        ${icon} ${attachment.name}
      </a>`
    )
  }

  /**
   * Creates a TOC element
   *
   * @param  {Object}  entry  The entry to render
   *
   * @return  {DOMElement}    The rendered DOM element
   */
  createTOCElement (entry) {
    return renderTemplate(
      `<div class="toc-entry-container" style="margin-left: ${entry.level * 10}px">
        <div class="toc-level">${entry.renderedLevel}</div>
        <div class="toc-entry" data-line="${entry.line}">
          ${entry.text}
        </div>
      </div>`)
  }

  /**
   * Returns true if the provided path extension is a valid image file type
   *
   * @param   {String}  extension  The extension to be tested
   *
   * @return  {Boolean}            The result of the check.
   */
  isImage (extension) {
    return FILETYPES_IMG.includes(extension)
  }

  /**
    * Refreshes the list with new attachments on dir change.
    */
  refresh () {
    if (this.fileContainer === null) {
      // DOM is not ready
      return
    }

    this.fileContainer.textContent = ''

    let currentDir = this._renderer.getCurrentDir()
    // Grab the newest attachments and refresh
    if (currentDir === null || currentDir.attachments.length === 0) {
      this.fileContainer.append(renderTemplate(`<p>${trans('gui.no_attachments')}</p>`))
      return // Don't activate in this instance
    }

    let fileExtIcon = clarityIcons.get('file-ext')
    for (let a of currentDir.attachments) {
      const link = this.createAttachmentElement(
        a,
        fileExtIcon
          ? fileExtIcon.replace('EXT', path.extname(a.path).slice(1, 4))
          : ''
      )
      link.firstChild.ondragstart = (event) => {
        // When dragging files from here onto the editor instance, users want
        // to have the appropriate link placed automatically, that is: images
        // should be wrapped in appropriate image tags, whereas documents
        // should be linked to enable click & open. We have to do this on
        // this end, because when trying to override data during drop it
        // won't work.
        const uri = decodeURIComponent(a.path)
        this.setDragData(
          this.isImage(a.ext.toLowerCase())
            ? `![${a.name}](${uri})`
            : `[${a.name}](${uri})`,
          event)
      }
      this.fileContainer.append(link)
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
   * Updates the Table of Contents with new contents
   *
   * @param   {Object}  tableOfContents  The new table
   */
  updateTOC (tableOfContents) {
    this.tocContainer.innerHTML = ''

    for (let line of tableOfContents) {
      const elem = this.createTOCElement(line)
      this.tocContainer.appendChild(elem)
    }

    // Finally activate the links
    const entries = this.tocContainer.querySelectorAll('.toc-entry')
    for (let entry of entries) {
      entry.addEventListener('click', (e) => {
        const targetLine = parseInt(entry.dataset.line, 10)
        this._renderer.getEditor().jtl(targetLine)
      })
    }
  }

  /**
   * Sets the actual HTML contents of the bibliography container.
   */
  setBibliographyContents (bib) {
    if (this.bibliographyContainer === null) {
      // DOM is not ready; Clarity custom elements are not loaded.
      return
    }
    if (typeof bib === 'string') {
      this.bibliographyContainer.innerHTML = `<p>${bib}</p>`
      return
    }
    // Convert links, so that they remain but do not open in the same
    // window.
    let aRE = /<a(.+?)>(.*?)<\/a>/g
    let hrefRE = /href="(.+)"/i
    let output = []
    for (let entry of bib[1]) {
      aRE.lastIndex = 0
      output.push(
        entry.replace(aRE, function (match, p1, p2, offset, string) {
          let href = hrefRE.exec(p1)
          if (href !== null) {
            return `<a onclick="global.ipc.send('open-external', { href: '${href[1]}'})">${p2}</a>`
          }
          // If we can't link it, return an unlinked link
          return p2
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
}
