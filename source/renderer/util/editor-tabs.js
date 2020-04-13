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

module.exports = class EditorTabs {
  constructor () {
    this._div = document.getElementById('document-tabs')

    this._intentCallback = null

    // Listen to the important events
    this._div.onclick = (event) => { this._onClick(event) }

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

    files = files.map(elem => elem.fileObject) // Make it easier accessible
    for (let file of files) {
      // Use the frontmatter title var, if applicable
      let name = file.name
      if (file.frontmatter && file.frontmatter.title) name = file.frontmatter.title
      this._div.appendChild(this.makeElement(name, file.hash, file.hash === openFile))
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

  makeElement (filename, hash, active = false) {
    let doc = document.createElement('div')
    doc.classList.add('document')
    doc.setAttribute('title', filename)
    doc.dataset['hash'] = hash
    if (active) doc.classList.add('active')

    let nameSpan = document.createElement('span')
    nameSpan.classList.add('filename')
    nameSpan.innerText = filename

    let closeSpan = document.createElement('span')
    closeSpan.classList.add('close')
    closeSpan.innerHTML = '&times;'

    doc.appendChild(nameSpan)
    doc.appendChild(closeSpan)
    return doc
  }
}
