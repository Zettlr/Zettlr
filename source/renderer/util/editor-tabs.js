/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:    EditorTabs class
 * CVM-Role:    Model
 * Maintainer:  Hendrik Erz
 * License:     GNU GPL v3
 *
 * Description: This class represents the open file tabs on the editor instance.
 *
 * END HEADER
 */

const { trans } = require('../../common/lang/i18n')
const path = require('path')

module.exports = class EditorTabs {
  constructor () {
    this._div = document.getElementById('document-tabs')

    this._intentCallback = null

    this._currentlyDragging = undefined
    this._tabbarLeft = this._div.getBoundingClientRect().left
    this._cursorOffset = 0

    // Listen to the important events
    this._div.onclick = (event) => { this._onClick(event) }
    this._div.ondragstart = (evt) => {
      // The user has initated a drag operation, so we need some variables
      // we'll be accessing throughout the drag operation: The currently
      // dragged element, the cursor offset (i.e. the amount of pixels the
      // cursor is within the element), and the current offset of the tabbar
      // itself.
      this._currentlyDragging = evt.target
      this._cursorOffset = evt.clientX - this._currentlyDragging.getBoundingClientRect().left
      this._tabbarLeft = this._div.getBoundingClientRect().left

      this._currentlyDragging.ondrag = (evt) => {
        // Immediately sort everything correctly.
        // Take the absolute X coord, and then make it relative:
        // 1. Substract the left offset (the sidebar)
        // 2. Move the position to the beginning of the element
        // 3. Take the current scrollLeft value into account
        let currentElementPosition = evt.clientX - this._cursorOffset - this._tabbarLeft + this._div.scrollLeft
        for (let elem of this._currentlyDragging.parentElement.childNodes) {
          if (elem === this._currentlyDragging) continue // No inception, please
          if (elem.offsetLeft > currentElementPosition) {
            elem.parentElement.insertBefore(this._currentlyDragging, elem)
            break
          }
        }
      }
    }
    this._div.ondragend = (evt) => {
      let newHashes = []
      // Now get the correct list of hashes
      for (let elem of this._currentlyDragging.parentElement.childNodes) {
        newHashes.push(parseInt(elem.dataset['hash'], 10))
      }

      if (this._intentCallback) this._intentCallback(newHashes, 'sorting')

      this._currentlyDragging.ondrag = null
      this._currentlyDragging = undefined
      this._cursorOffset = 0
    }
    // Initial sync with no files
    this.syncFiles([], null)
  }

  setIntentCallback (callback) {
    this._intentCallback = callback
  }

  syncFiles (files, openFile) {
    this._div.innerHTML = '' // Reset

    if (files.length === 0) {
      // No files, so indicate!
      let noFiles = document.createElement('div')
      noFiles.classList.add('no-files')
      noFiles.innerText = 'No open files.'
      let addNew = document.createElement('button')
      addNew.classList.add('add-new-file')
      addNew.innerText = '+ Create new'
      noFiles.appendChild(addNew)
      this._div.append(noFiles)
      return
    }

    // files = files.map(elem => elem.fileObject) // Make it easier accessible
    for (let document of files) {
      let file = document.fileObject
      let isDocumentClean = document.cmDoc.isClean()
      let isActiveFile = file.hash === openFile
      let elem = this._makeElement(file, isActiveFile, isDocumentClean)
      this._div.appendChild(elem)
    }

    // Now make sure that the active tab is visible and scroll if necessary.
    let tabbarWidth = this._div.offsetWidth
    let activeElem = this._div.getElementsByClassName('active')[0]
    if (activeElem.offsetLeft + activeElem.offsetWidth > tabbarWidth) {
      this._div.scrollLeft += activeElem.offsetLeft + activeElem.offsetWidth - tabbarWidth
    } else if (activeElem.offsetLeft + activeElem.offsetWidth < 0) {
      console.log('Scrolling! Active element is out of view (to the LEFT)')
      // TODO: How do we do this?
    }

    // After synchronising, enable the tippy
    global.tippy('#document-tabs .document', {
      delay: [ 1000, null ], // Show after 1s, hide normally
      allowHTML: true, // There is HTML in the contents
      placement: 'bottom' // Prefer to display it on the bottom
    })
  }

  markDirty (hash) {
    for (let elem of this._div.children) {
      if (parseInt(elem.dataset['hash'], 10) === hash) {
        elem.classList.add('modified')
      }
    }
  }

  markClean (hash) {
    for (let elem of this._div.children) {
      if (parseInt(elem.dataset['hash'], 10) === hash) {
        elem.classList.remove('modified')
      }
    }
  }

  _onClick (event) {
    if (event.target.classList.contains('add-new-file')) {
      // The user has clicked the "add new file" thingy
      if (this._intentCallback) this._intentCallback(null, 'new-file')
      return
    }

    if (event.target.getAttribute('id') === 'document-tabs') return // No file selected
    let closeIntent = event.target.classList.contains('close')
    let hash = event.target
    if (!hash.classList.contains('document')) hash = hash.parentNode
    hash = hash.dataset['hash']
    console.log((closeIntent) ? 'Should close!' : 'Should select', hash)

    // If given, call the callback
    if (this._intentCallback) {
      this._intentCallback(hash, (closeIntent) ? 'close' : 'select')
    }
  }

  /**
   * Creates a new document DOM element to be added to the tab bar based on the
   * information available in the file descriptor.
   * @param {Object} file A file descriptor
   * @param {boolean} active Whether the file is currently active
   * @param {boolean} clean Whether the document is clean or contains changes
   */
  _makeElement (file, active = false, clean = true) {
    // First determine the display title (either filename or frontmatter title)
    let displayTitle = file.name
    if (file.frontmatter && file.frontmatter.title) displayTitle = file.frontmatter.title

    // Then create the document div
    let doc = document.createElement('div')
    doc.classList.add('document')
    doc.setAttribute('draggable', 'true') // Users can drag that thing around
    doc.dataset['hash'] = file.hash
    // Show some additional information on hover
    doc.dataset['tippyContent'] = `<strong>${file.name}</strong><br>`
    doc.dataset['tippyContent'] += `<small>(${path.basename(path.dirname(file.path))})</small><br>`
    doc.dataset['tippyContent'] += file.wordCount + ' ' + trans('dialog.target.words')
    doc.dataset['tippyContent'] += ', ' + file.charCount + ' ' + trans('dialog.target.chars')
    // From here on, possible information begins, so we have to add <br>s before
    if (file.id !== '') doc.dataset['tippyContent'] += '<br>ID: ' + file.id

    // Mark it as active and/or modified, if applicable
    if (active) doc.classList.add('active')
    if (!clean) doc.classList.add('modified')

    // Next create the name span containing the display title
    let nameSpan = document.createElement('span')
    nameSpan.classList.add('filename')
    nameSpan.innerText = displayTitle

    // Also enable closing of the document
    let closeSpan = document.createElement('span')
    closeSpan.classList.add('close')
    closeSpan.innerHTML = '&times;'

    doc.appendChild(nameSpan)
    doc.appendChild(closeSpan)

    // In case there's a writing target, append that as well
    if (file.target) {
      let current = file.charCount
      if (file.target.mode === 'words') current = file.wordCount
      let targetValue = trans('dialog.target.chars')
      if (file.target.mode === 'words') targetValue = trans('dialog.target.words')

      let progress = Math.round(current / file.target.count * 100)
      if (progress > 100) progress = 100 // Never exceed 100 %

      // We now need to append this to the tippyContent
      doc.dataset['tippyContent'] += `<br>${current}/${file.target.count} ${targetValue} (${progress} %)`
    }

    return doc
  }
}
