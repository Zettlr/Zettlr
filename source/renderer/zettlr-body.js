/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrBody class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is a model that represents all GUI elements that are
 *                  not controlled by one of the other Models (e.g. affect the
 *                  whole app)
 *
 * END HEADER
 */
const $ = require('jquery')
require('jquery-ui/ui/data')
require('jquery-ui/ui/scroll-parent')
require('jquery-ui/ui/version')
require('jquery-ui/ui/widget')
require('jquery-ui/ui/widgets/mouse')
require('jquery-ui/ui/widgets/sortable')

const ZettlrNotification = require('./zettlr-notification.js')

// Dialogs
const StatsDialog = require('./dialog/stats.js')
const TagCloud = require('./dialog/tag-cloud.js')
const UpdateDialog = require('./dialog/update.js')
const AboutDialog = require('./dialog/about.js')
const PreferencesDialog = require('./dialog/preferences.js')
const PDFPreferences = require('./dialog/pdf-preferences.js')
const TagsPreferences = require('./dialog/tags-preferences.js')
const ProjectProperties = require('./dialog/project-properties.js')
const CustomCSS = require('./dialog/custom-css.js')
const ErrorDialog = require('./dialog/error-dialog.js')
const DevClipboard = require('./dialog/clipboard.js')

const { trans } = require('../common/lang/i18n.js')
const localiseNumber = require('../common/util/localise-number')
const generateFileName = require('../common/util/generate-filename')
const generateTable = require('../common/util/generate-markdown-table')

/**
 * This class's duty is to handle everything that affects (or can potentially
 * occur over) the whole app window, such as dialogs or popups. Among the task
 * of this class is to bundle these together for easy access so that we always
 * know where to put such things.
 */
class ZettlrBody {
  /**
    * Activate whatever we need
    * @param {ZettlrRenderer} parent The renderer main object
    */
  constructor (parent) {
    this._renderer = parent
    this._spellcheckLangs = null // This holds all available languages
    this._n = [] // Holds all notifications currently displaying

    // This object caches the values of search and replace value, so they stay
    // persistent on a per-session basis.
    this._findPopup = { 'searchVal': '', 'replaceVal': '' }

    document.addEventListener('dragover', function (event) {
      event.preventDefault()
      return false
    }, false)

    // On drop, tell the renderer to tell main that there's something to
    // handle.
    document.addEventListener('drop', (event) => {
      event.preventDefault()
      // Retrieve all paths
      let f = []
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        f.push(event.dataTransfer.files.item(i).path)
      }
      this._renderer.handleDrop(f)
      return false
    }, false)

    // Apply certain classes when the meta keys that trigger special actions are
    // pressed.
    $(document).on('keydown keyup', (event) => {
      let metaElements = $('#editor .CodeMirror .cm-zkn-tag, #editor .CodeMirror .cm-zkn-link, #editor .CodeMirror .cma')

      let darwinMeta = process.platform === 'darwin' && event.metaKey
      let otherCtrl = process.platform !== 'darwin' && event.ctrlKey

      if (darwinMeta || otherCtrl) {
        metaElements.addClass('meta-key')
      } else {
        metaElements.removeClass('meta-key')
      }
    })

    // React to global GUI shortcuts
    $(document).on('keydown', (event) => {
      let isDarwin = document.body.classList.contains('darwin')
      let cmdOrCtrl = (isDarwin && event.metaKey) || (!isDarwin && event.ctrlKey)

      let focusEditorShortcut = (cmdOrCtrl && event.shiftKey && event.key === 'e')
      let focusFileManagerShortcut = (cmdOrCtrl && event.shiftKey && event.key === 't')
      if (focusEditorShortcut) { // Cmd/Ctrl+Shift+E
        // Obviously, focus the editor
        this._renderer.getEditor().focus()
      } else if (focusFileManagerShortcut) { // Cmd/Ctrl+Shift+T
        // You know what to do
        document.getElementById('file-list').focus()
      } else if (event.key === 'F2') {
        // Trigger a rename
        this.requestNewFileName(this._renderer.getActiveFile())
      }
    })

    // Inject a global notify and notifyError function
    global.notify = (msg) => { this.notify(msg) }
    global.notifyError = (msg) => { this.notifyError(msg) }
  }

  /**
    * Display a small popup to ask for a new file name
    * @param  {ZettlrDir} dir A directory object
    * @return {void}     Nothing to return.
    */
  requestFileName (dir, newFileButton = false) {
    // No directory selected.
    if (!dir) return this.notify(trans('system.please_select_directory'))

    // Check if the file should be created immediately. Do this after check for
    // popups due to semantic reasons (this way the action always closes any
    // other popup, which makes sense for users).
    if (global.config.get('newFileDontPrompt')) {
      return global.ipc.send('file-new', { 'name': generateFileName(), 'hash': dir.hash })
    }

    // If the newFileButton has been clicked, center the popup there, not someplace else
    let targetElement = (newFileButton) ? document.querySelector('#document-tabs .add-new-file') : document.querySelector('.button.file-new')

    const data = {
      'val': generateFileName(),
      'placeholder': trans('dialog.file_new.placeholder')
    }

    // Show the appropriate popup
    global.popupProvider.show('textfield', targetElement, data, (form) => {
      if (form !== null) {
        global.ipc.send('file-new', { 'name': form[0].value, 'hash': dir.hash })
      }
    })
  }

  /**
    * Display a small popup for a new directory.
    * @param  {ZettlrDir} dir The parent directory object.
    * @return {void}     Nothing to return.
    */
  requestDirName (dir) {
    // No directory selected.
    if (!dir) return this.notify(trans('system.please_select_directory'))

    let elem

    // Selection method stolen from requestNewDirName
    const expandedFileManager = document.getElementById('file-manager').classList.contains('expanded')
    const hiddenFileTree = document.getElementById('file-tree').classList.contains('hidden')
    if (!expandedFileManager && hiddenFileTree) {
      // The file manager is in thin mode and tree-view is hidden, so the file list
      // is visible -> find the div in there. (Should be the top containing dir)
      elem = document.querySelector('#file-list div[data-hash="' + dir.hash + '"]')
    } else {
      // The combiner is in extended mode and/or the tree view is visible.
      elem = document.querySelector('#file-tree div[data-hash="' + dir.hash + '"]')
    }

    // In case the combiner was not in an extended mode and the preview list did
    // not contain the directory fall back to the file manager element itself. But
    // this should normally never happen.
    if (elem.length === 0) elem = document.getElementById('file-manager')

    const data = {
      'val': trans('dialog.dir_new.value'),
      'placeholder': trans('dialog.dir_new.placeholder')
    }

    // Show the appropriate popup
    global.popupProvider.show('textfield', elem, data, (form) => {
      if (form !== null) {
        global.ipc.send('dir-new', { 'name': form[0].value, 'hash': dir.hash })
      }
    })
  }

  /**
    * Display a small popup to ask for a new dir name for an already existing.
    * @param  {ZettlrDir} dir The directory to be renamed
    * @return {void}     Nothing to return.
    */
  requestNewDirName (dir) {
    if (dir === null) return

    let elem = document.querySelector('#file-tree div[data-hash="' + dir.hash + '"]')
    const data = {
      'val': dir.name,
      'placeholder': trans('dialog.dir_rename.placeholder')
    }

    // Show the appropriate popup
    global.popupProvider.show('textfield', elem, data, (form) => {
      if (form !== null) {
        global.ipc.send('dir-rename', { 'name': form[0].value, 'hash': dir.hash })
      }
    })
  }

  /**
    * Requests a new file name.
    * @param  {ZettlrFile} file The file to be renamed.
    * @return {void}      Nothing to return.
    */
  requestNewFileName (file) {
    let elem = ''
    if (this._renderer.getActiveFile() != null && this._renderer.getActiveFile().hash === file.hash) {
      // TODO: Need to make this appropriate for all open files (open popup under their respective tabs)
      elem = document.querySelector('.button.file-rename')
    } else {
      elem = document.querySelector('#file-list div[data-hash="' + file.hash + '"]')
      if (elem.length === 0) {
        // Obviously the file is standalone
        elem = document.querySelector('#file-tree div[data-hash="' + file.hash + '"]')
      }
    }

    const data = {
      'val': file.name,
      'placeholder': trans('dialog.file_rename.placeholder')
    }

    // Show the appropriate popup
    global.popupProvider.show('textfield', elem, data, (form) => {
      if (form !== null) {
        global.ipc.send('file-rename', { 'name': form[0].value, 'hash': file.hash })
      }
    })
  }

  /**
    * Displays file information (such as word count etc)
    */
  showFileInfo () {
    let info = this._renderer.getEditor().getFileInfo()

    let data = {
      'words': localiseNumber(info.words),
      'chars': localiseNumber(info.chars),
      'chars_wo_spaces': localiseNumber(info.chars_wo_spaces),
      'selections': info.selections.map(sel => {
        return {
          'selectionLength': localiseNumber(sel.selectionLength),
          'start': {
            'line': sel.start.line + 1,
            'ch': sel.start.ch + 1
          },
          'end': {
            'line': sel.end.line + 1,
            'ch': sel.end.ch + 1
          }
        }
      })
    }

    // Show the appropriate popup
    global.popupProvider.show('file-info', document.querySelector('#toolbar .file-info'), data)
  }

  /**
    * Display a small notifiation.
    * @param  {String} message What should the user be notified about?
    * n {ZettlrBody}         Chainability.
    */
  notify (message) {
    this._n.push(new ZettlrNotification(this, message))
    return this
  }

  /**
    * Remove a notification from the array and tell the others to re-place
    * themselves.
    * @param  {ZettlrNotification} ntf  The notification that wants itself removed.
    * @return {void}      Nothing to return.
    */
  notifySplice (ntf) {
    let index = this._n.indexOf(ntf)
    if (index > -1) this._n.splice(index, 1)
    for (let msg of this._n) msg.moveUp()
  }

  /**
   * Displays a dedicated dialog. Should not be used for all errors, but only
   * for those where the error information is large.
   * @param  {Error} message The error object
   * @return {void}         Does not return.
   */
  notifyError (message) {
    let d = new ErrorDialog()
    d.init(message).open()
  }

  /**
    * Opens the exporting popup
    * @param  {ZettlrFile} file Which file should be exported?
    * @return {ZettlrBody}      Chainability.
    */
  displayExport (file) {
    // Show the appropriate popup
    global.popupProvider.show('export', document.querySelector('.button.share'))

    $('.btn-share').click((e) => {
      let elem = e.target

      // Make sure to traverse up from the Clarity icon, if necessary
      while (!elem.classList.contains('btn-share')) {
        elem = elem.parentElement
      }

      // The revealjs-button doesn't trigger an export, but the visibility
      // of the themes selection
      if ($(elem).hasClass('revealjs')) {
        $('#reveal-themes').toggleClass('hidden')
        return
      }

      let ext = $(elem).attr('data-ext')
      global.ipc.send('export', { 'hash': file.hash, 'ext': ext })
      global.popupProvider.close()
    })
  }

  /**
    * Open a new dialog for displaying the preferences.
    * @param  {Object} prefs An object containing all current config variables
    * @return {void}       Nothing to return.
    */
  displayPreferences (prefs) {
    this._currentDialog = new PreferencesDialog()
    this._currentDialog.init(prefs).open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
    * Open a new dialog for displaying the PDF preferences.
    * @param  {Object} prefs An object containing all current config variables
    * @return {void}       Nothing to return.
    */
  displayPDFPreferences (prefs) {
    this._currentDialog = new PDFPreferences()
    this._currentDialog.init(prefs).open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
    * Displays the tag preferences with the current settings.
    * @param  {Object} prefs An object containing the current tags.
    * @return {void}       Nothing to return.
    */
  displayTagsPreferences (prefs) {
    this._currentDialog = new TagsPreferences()
    this._currentDialog.init(prefs).open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
   * Display the tag cloud dialog.
   * @param  {Object} tags The array containing all tags
   * @return {void}      Nothing to return.
   */
  displayTagCloud () {
    global.ipc.send('get-tags-database', {}, (ret) => {
      this._currentDialog = new TagCloud()
      this._currentDialog.init(ret).open()
      this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
    })
  }

  /**
    * Displays project properties for a given project.
    * @param  {Object} prefs The project's preferences.
    * @return {void}       Nothing to return.
    */
  displayProjectProperties (prefs) {
    this._currentDialog = new ProjectProperties()
    // We need the project directory's name as a default value
    prefs.projectDirectory = this.getRenderer().findObject(prefs.hash).name
    this._currentDialog.init(prefs).open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
    * Displays the update notification
    * @param  {Object} cnt An object containing information on the update.
    */
  displayUpdate (cnt) {
    this._currentDialog = new UpdateDialog()
    this._currentDialog.init(cnt).open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
    * Displays the about dialog
    */
  displayAbout () {
    this._currentDialog = new AboutDialog()
    this._currentDialog.init().open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
   * This dialog lets the user edit his/her custom CSS
   */
  displayCustomCss () {
    global.ipc.send('get-custom-css', {}, (ret) => {
      this._currentDialog = new CustomCSS()
      this._currentDialog.init(ret).open()
      this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
    })
  }

  /**
   * Displays the stats popup.
   * @param  {Object} data The statistical data to be shown
   * @return {void}      No return.
   */
  displayStats (data) {
    let context = {
      'displaySum': (data.sumMonth > 99999) ? '>100k' : localiseNumber(data.sumMonth),
      'avgMonth': localiseNumber(data.avgMonth),
      'today': localiseNumber(data.today),
      'cmpToday': data.today,
      'cmpAvg': data.avgMonth,
      'cmpAvgHalf': data.avgMonth / 2
    }

    // Show the appropriate popup
    global.popupProvider.show('stats', document.querySelector('#toolbar .stats'), context)

    $('#more-stats').on('click', (e) => {
      // Theres no form but the user has clicked the more button
      this._currentDialog = new StatsDialog()
      this._currentDialog.init(data.wordCount).open()
      this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
      // After opening the dialog, close the popup. The user probably doesn't
      // want to click twice to continue writing.
      global.popupProvider.close()
    })
  }

  /**
    * Displays the find-in-file popup.
    * @return {void} Nothing to return.
    */
  displayFind () {
    if (this._renderer.getActiveFile() == null) return
    let regexRE = /^\/.+\/[gimy]{0,4}$/ // It's meta, dude!

    // Now we need to find out if there are selections in the editor that we
    // should respect (i.e. automatically search for this).
    let selections = this._renderer.getEditor().getSelections()
    if (selections.length > 0) this._findPopup.searchVal = selections[0]

    // Display the popup
    global.popupProvider.show('find', document.querySelector('.button.find'), this._findPopup, (form) => {
      // Remove search cursor once the popup is closed
      global.editorSearch.stop()
    }) // .makePersistent()

    const searchForElement = document.getElementById('searchWhat')
    const searchFor = () => searchForElement.value || ''
    const replaceWithElement = document.getElementById('replaceWhat')
    const replaceWith = () => replaceWithElement.value
    // If a regular expression was restored to the find popup, make sure to set
    // the respective class.
    if (regexRE.test(searchFor())) {
      searchForElement.classList.add('regexp')
      replaceWithElement.classList.add('regexp')
    }

    // Select the search input for convenience
    searchForElement.select()

    // Another convenience: Already highlight all occurrences within the
    // document, if there is content in the find field.
    if (searchFor()) {
      global.editorSearch.highlightOccurrences(searchFor())
    }

    searchForElement.addEventListener('keyup', (e) => {
      this._findPopup.searchVal = searchFor()
      const isRegExp = regexRE.test(searchFor())
      searchForElement.classList.toggle('regexp', isRegExp)
      replaceWithElement.classList.toggle('regexp', isRegExp)

      if (e.which === 13) { // Enter
        $('#searchNext').click()
      }
    })

    replaceWithElement.addEventListener('keyup', (e) => {
      this._findPopup.replaceVal = replaceWith()
      if (e.which === 13) { // Return
        e.preventDefault()
        if (e.altKey) {
          $('#replaceAll').click()
        } else {
          $('#replaceNext').click()
        }
      }
    })

    $('#searchNext').click((e) => {
      let res = global.editorSearch.next(searchFor())
      // Indicate non-successful matches where nothing was found
      searchForElement.classList.toggle('not-found', !res)
    })

    $('#replaceNext').click((e) => {
      // If the user hasn't searched before, initate a search beforehand.
      if (!global.editorSearch.hasSearch()) $('#searchNext').click()
      let res = global.editorSearch.replaceNext(replaceWith())
      searchForElement.classList.toggle('not-found', !res)
    })

    $('#replaceAll').click((e) => {
      global.editorSearch.replaceAll(searchFor(), replaceWith())
    })
  }

  /**
    * Displays a popup containing all formattings
    */
  displayFormatting () {
    // Show the popup
    global.popupProvider.show('format', document.querySelector('.button.formatting'))

    const headerFormattingElement = document.getElementById('header-formatting')
    headerFormattingElement.addEventListener('mousemove', (e) => {
      let elem = $(e.target)
      $('.formatting span').removeClass('active')
      if (!elem.is('span')) {
        headerFormattingElement.classList.add('markdownHeading1')
        return
      }
      // Nice little effect
      switch (e.target.className) {
        case 'markdownHeading6':
          $('.formatting .markdownHeading6').addClass('active')
          // fall through
        case 'markdownHeading5':
          $('.formatting .markdownHeading5').addClass('active')
          // fall through
        case 'markdownHeading4':
          $('.formatting .markdownHeading4').addClass('active')
          // fall through
        case 'markdownHeading3':
          $('.formatting .markdownHeading3').addClass('active')
          // fall through
        case 'markdownHeading2':
          $('.formatting .markdownHeading2').addClass('active')
          // fall through
        case 'markdownHeading1':
          $('.formatting .markdownHeading1').addClass('active')
      }
      headerFormattingElement.className = e.target.className
    })

    $('.formatting a').click((e) => {
      if (e.target.className === 'markdownInsertTable') {
        e.stopPropagation()
        e.preventDefault()
        // Display the generator popup
        return this.displayTableGenerator()
      }
      $('.formatting span').removeClass('active')
      this._renderer.handleEvent('cm-command', e.target.className)
      global.popupProvider.close()
    })
  }

  displayTableGenerator () {
    // Show the popup
    global.popupProvider.show('table', document.querySelector('.button.formatting'))

    $('.table-generator').mouseleave(e => { $('.table-generator .cell').removeClass('active') })

    // For the nice little colouring effect
    $('.table-generator .cell').hover(e => {
      let rows = e.target.dataset.rows
      let cols = e.target.dataset.cols
      $('.table-generator .cell').removeClass('active')
      for (let i = 1; i <= rows; i++) {
        for (let k = 1; k <= cols; k++) {
          $(`.table-generator .cell[data-rows="${i}"][data-cols="${k}"]`).addClass('active')
        }
      }
    })

    $('.table-generator .cell').click(e => {
      let table = generateTable(e.target.dataset.rows, e.target.dataset.cols)
      this._renderer.getEditor().insertText(table)
      global.popupProvider.close()
    })
  }

  /**
    * Displays a table of content.
    * @return {void} (Point of) No return.
    */
  displayTOC () {
    if (this._renderer.getActiveFile() == null) return

    let toc = this._renderer.getEditor().buildTOC()

    if (toc.length === 0) return

    // Show the popup
    global.popupProvider.show('table-of-contents', document.querySelector('.button.show-toc'), { 'entries': toc })

    // On click jump to line
    $('.toc-link').click((event) => {
      let elem = $(event.target)
      this._renderer.getEditor().jtl(elem.attr('data-line'))
    })

    // Sortable
    $('#toc-popup').sortable({
      axis: 'y',
      items: '> .toc-link',
      update: (event, ui) => {
        // The user has dropped the item someplace else.
        let newIndex = ui.item.index()
        let originalLine = parseInt(ui.item.attr('data-line'))
        let sumLength = $('#toc-popup > .toc-link').length
        if (newIndex < sumLength - 1) {
          let elementBelow = $('#toc-popup > .toc-link').eq(newIndex + 1)
          let aboveLine = parseInt(elementBelow.attr('data-line'))
          this._renderer.getEditor().moveSection(originalLine, aboveLine)
        } else {
          this._renderer.getEditor().moveSection(originalLine, -1)
        }

        // Cool, now destroy the sortable, rebuild the TOC, and re-fill the div
        // again.
        $('#toc-popup').sortable('destroy')
        global.popupProvider.close()
        this.displayTOC()
      }
    })
  }

  displayDevClipboard () {
    // DevClipboard
    global.popupProvider.close()
    this._currentDialog = new DevClipboard()
    this._currentDialog.init({}).open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
    * Returns the renderer
    * @return {ZettlrRenderer} The renderer object
    */
  getRenderer () { return this._renderer }
}

module.exports = ZettlrBody
