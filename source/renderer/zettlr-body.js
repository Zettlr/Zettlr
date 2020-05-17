/* global $ */
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

const ZettlrCon = require('./zettlr-context.js')
const ZettlrNotification = require('./zettlr-notification.js')
const popup = require('./zettlr-popup.js')
const makeTemplate = require('../common/zettlr-template.js')

// Dialogs
const StatsDialog = require('./dialog/stats.js')
const TagCloud = require('./dialog/tag-cloud.js')
const UpdateDialog = require('./dialog/update.js')
const AboutDialog = require('./dialog/about.js')
const PasteImage = require('./dialog/paste-image.js')
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
    // Holds the currently displayed dialog. Prevents multiple dialogs from appearing.
    this._currentDialog = null
    // Holds the current popup. Prevents multiple popups from appearing.
    this._currentPopup = null
    this._currentTheme = 'berlin' // Default theme is Berlin

    // This object caches the values of search and replace value, so they stay
    // persistent on a per-session basis.
    this._findPopup = { 'searchVal': '', 'replaceVal': '' }

    // Event listener for the context menu
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      let menu = new ZettlrCon(this)
      menu.popup(e)
    }, false)

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
      let isDarwin = $('body').hasClass('darwin')
      if (event.ctrlKey || event.altKey || (event.metaKey && isDarwin)) {
        metaElements.addClass('meta-key')
      } else {
        metaElements.removeClass('meta-key')
      }
    })

    // React to global GUI shortcuts
    $(document).on('keydown', (event) => {
      let isDarwin = $('body').hasClass('darwin')
      let cmdOrCtrl = (isDarwin && event.metaKey) || (!isDarwin && event.ctrlKey)
      let focusEditorShortcut = (cmdOrCtrl && event.shiftKey && event.which === 69)
      let focusSidebarShortcut = (cmdOrCtrl && event.shiftKey && event.which === 84)
      if (focusEditorShortcut) { // Cmd/Ctrl+Shift+E
        // Obviously, focus the editor
        this._renderer.getEditor().getEditor().focus()
      } else if (focusSidebarShortcut) { // Cmd/Ctrl+Shift+T
        // You know what to do
        $('#file-list').focus()
      }
    })

    // Inject a global notify and notifyError function
    global.notify = (msg) => { this.notify(msg) }
    global.notifyError = (msg) => { this.notifyError(msg) }

    // Afterwards, activate the event listeners of the window controls
    $('.windows-window-controls .minimise').click((e) => {
      global.ipc.send('win-minimise')
    })
    $('.windows-window-controls .resize').click((e) => {
      global.ipc.send('win-maximise')
    })
    $('.windows-window-controls .close').click((e) => {
      global.ipc.send('win-close')
    })
  }

  /**
   * Is called by the app on a configuration change so that the body can make
   * necessary adjustments.
   */
  configChange () {
    let newTheme = global.config.get('display.theme')
    // Check if we really need to replace the style to prevent ugly flickering
    // when replacing the same theme with the same.
    if (this._currentTheme === newTheme) return

    // On config change, change the theme according to the settings
    let href = $('link#theme-css').attr('href')
    href = href.replace(/bielefeld|berlin|frankfurt|karl-marx-stadt|bordeaux/, newTheme)
    $('link#theme-css').attr('href', href)
    this._renderer.getEditor().refresh()
    this._currentTheme = newTheme
  }

  /**
    * Display a small popup to ask for a new file name
    * @param  {ZettlrDir} dir A directory object
    * @return {void}     Nothing to return.
    */
  requestFileName (dir, newFileButton = false) {
    // No directory selected.
    if (!dir) return

    // Don't open multiple popups
    if (this._currentPopup) this._currentPopup.close(true)

    // Check if the file should be created immediately. Do this after check for
    // popups due to semantic reasons (this way the action always closes any
    // other popup, which makes sense for users).
    if (global.config.get('newFileDontPrompt')) {
      return global.ipc.send('file-new', { 'name': generateFileName(), 'hash': dir.hash })
    }

    let cnt = makeTemplate('popup', 'textfield', {
      'val': generateFileName(),
      'placeholder': trans('dialog.file_new.placeholder')
    })

    // If the newFileButton has been clicked, center the popup there, not someplace else
    let targetElement = (newFileButton) ? $('#document-tabs .add-new-file') : $('.button.file-new')

    this._currentPopup = popup(targetElement, cnt, (form) => {
      if (form) {
        global.ipc.send('file-new', { 'name': form[0].value, 'hash': dir.hash })
      }
      this._currentPopup = null // Reset current popup
    })
  }

  /**
    * Display a small popup to ask for a new file name
    * @param  {Object} file A file hash.
    * @return {void}     Nothing to return.
    */
  requestDuplicate (file) {
    // No file given.
    if (!file) return

    // Retrieve the file
    file = this._renderer.findObject(file.hash)

    // Don't open multiple popups
    if (this._currentPopup) this._currentPopup.close(true)

    // Cannot duplicate aliases
    if (file.hasOwnProperty('isAlias') && file.isAlias) return

    let cnt = makeTemplate('popup', 'textfield', {
      'val': 'Copy of ' + file.name,
      'placeholder': trans('dialog.file_new.placeholder')
    })

    this._currentPopup = popup($('#sidebar div[data-hash="' + file.hash + '"]'), cnt, (form) => {
      if (form) {
        global.ipc.send('file-duplicate', {
          'dir': file.parent.hash,
          'file': file.hash,
          'name': form[0].value
        })
      }
      this._currentPopup = null // Reset current popup
    })
  }

  /**
    * Display a small popup for a new directory.
    * @param  {ZettlrDir} dir The parent directory object.
    * @return {void}     Nothing to return.
    */
  requestDirName (dir) {
    // No directory selected.
    if (!dir) return
    // Prevent multiple popups
    if (this._currentPopup) this._currentPopup.close(true)

    let elem

    // Selection method stolen from requestNewDirName
    if (!$('#sidebar').hasClass('expanded') && $('#file-tree').hasClass('hidden')) {
      // The sidebar is in thin mode and tree-view is hidden, so the file list
      // is visible -> find the div in there. (Should be the top containing dir)
      elem = $('#file-list').find('div[data-hash="' + dir.hash + '"]').first()
    } else {
      // The combiner is in extended mode and/or the tree view is visible.
      elem = $('#file-tree').find('div[data-hash="' + dir.hash + '"]').first()
    }

    // In case the combiner was not in an extended mode and the preview list did
    // not contain the directory fall back to the sidebar element itself. But
    // this should normally never happen.
    if (elem.length === 0) elem = $('#sidebar')

    let cnt = makeTemplate('popup', 'textfield', {
      'val': trans('dialog.dir_new.value'),
      'placeholder': trans('dialog.dir_new.placeholder')
    })

    this._currentPopup = popup(elem, cnt, (form) => {
      if (form) {
        global.ipc.send('dir-new', { 'name': form[0].value, 'hash': dir.hash })
      }
      this._currentPopup = null // Reset current popup
    })
  }

  /**
    * Display a small popup to ask for a new dir name for an already existing.
    * @param  {ZettlrDir} dir The directory to be renamed
    * @return {void}     Nothing to return.
    */
  requestNewDirName (dir) {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple instances
    let elem = $('#file-tree').find('div[data-hash="' + dir.hash + '"]').first()
    let cnt = makeTemplate('popup', 'textfield', {
      'val': dir.name,
      'placeholder': trans('dialog.dir_rename.placeholder')
    })

    this._currentPopup = popup(elem, cnt, (form) => {
      if (form) {
        global.ipc.send('dir-rename', { 'name': form[0].value, 'hash': dir.hash })
      }
      this._currentPopup = null
    })
  }

  /**
    * Requests a new file name.
    * @param  {ZettlrFile} file The file to be renamed.
    * @return {void}      Nothing to return.
    */
  requestNewFileName (file) {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple popups
    let elem = ''
    if (this._renderer.getActiveFile() != null && this._renderer.getActiveFile().hash === file.hash) {
      // TODO: Need to make this appropriate for all open files (open popup under their respective tabs)
      elem = $('.button.file-rename')
    } else {
      elem = $('#file-list').find('div[data-hash="' + file.hash + '"]').first()
      if (elem.length === 0) {
        // Obviously the file is standalone
        elem = $('#file-tree').find('div[data-hash="' + file.hash + '"]').first()
      }
    }

    let cnt = makeTemplate('popup', 'textfield', {
      'val': file.name,
      'placeholder': trans('dialog.file_rename.placeholder')
    })

    this._currentPopup = popup(elem, cnt, (form) => {
      if (form) {
        global.ipc.send('file-rename', { 'name': form[0].value, 'hash': file.hash })
      }
      this._currentPopup = null
    })
  }

  /**
   * Shows the popup to set or update a target on a file.
   * @param {number} hash The hash for which the popup should be shown.
   */
  setTarget (hash) {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple popups
    let file = this._renderer.findObject(hash)
    if (!file) return // No file given

    let targetMode = 'words'
    let targetCount = 0

    if (file.hasOwnProperty('target') && file.target != null) {
      // Overwrite the properties with the ones given
      targetMode = file.target.mode || 'words' // Fallback
      targetCount = file.target.count || 0
    }

    let cnt = makeTemplate('popup', 'target', {
      'mode': targetMode,
      'count': targetCount
    })

    this._currentPopup = popup($(`[data-hash=${hash}]`), cnt, (form) => {
      if (form) {
        global.ipc.send('set-target', {
          'hash': parseInt(hash),
          'mode': form[1].value,
          'count': parseInt(form[0].value)
        })
      }

      this._currentPopup = null
    })
  }

  /**
    * Displays file information (such as word count etc)
    * @return {ZettlrPopup} The popup that is shown.
    */
  showFileInfo () {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple popups

    let info = this._renderer.getEditor().getFileInfo()

    let data = {
      'words': localiseNumber(info.words),
      'chars': localiseNumber(info.chars),
      'chars_wo_spaces': localiseNumber(info.chars_wo_spaces),
      'words_sel': (info.words_sel) ? localiseNumber(info.words_sel) : null,
      'chars_sel': (info.chars_sel) ? localiseNumber(info.chars_sel) : null
    }

    let cnt = makeTemplate('popup', 'file-info', data)
    this._currentPopup = popup($('#toolbar .file-info'), cnt, () => {
      this._currentPopup = null
    })
    return this._currentPopup
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
   * Set the theme depending of a truthy or falsy value of val.
   * @param  {Boolean} val Either true or false.
   * @return {ZettlrBody}     Chainability.
   */
  darkTheme (val) {
    if (val && !$('body').hasClass('dark')) $('body').addClass('dark')
    else if (!val) $('body').removeClass('dark')
    return this
  }

  /**
    * Opens the exporting popup
    * @param  {ZettlrFile} file Which file should be exported?
    * @return {ZettlrBody}      Chainability.
    */
  displayExport (file) {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple popups
    // Create a popup

    let cnt = makeTemplate('popup', 'export', { 'hash': file.hash })
    if (!cnt) return this

    this._currentPopup = popup($('.button.share'), cnt)

    $('.btn-share').click((e) => {
      // The revealjs-button doesn't trigger an export, but the visibility
      // of the themes selection
      if ($(e.target).hasClass('revealjs')) {
        $('#reveal-themes').toggleClass('hidden')
        return
      }

      let ext = $(e.target).attr('data-ext')
      let hash = $(e.target).attr('data-hash')
      global.ipc.send('export', { 'hash': hash, 'ext': ext })
      this._currentPopup.close()
      this._currentPopup = null
    })
  }

  /**
    * Open a new dialog for displaying the preferences.
    * @param  {Object} prefs An object containing all current config variables
    * @return {void}       Nothing to return.
    */
  displayPreferences (prefs) {
    if (this._currentDialog !== null) return // Only one dialog at a time
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
    if (this._currentDialog !== null) return // Only one dialog at a time
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
    if (this._currentDialog !== null) return // Only one dialog at a time
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
    if (this._currentDialog !== null) return // Only one dialog at a time
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
    if (this._currentDialog !== null) return // Only one dialog at a time
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
    if (this._currentDialog !== null) return // Only one dialog at a time
    this._currentDialog = new UpdateDialog()
    this._currentDialog.init(cnt).open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
    * Displays the about dialog
    */
  displayAbout () {
    if (this._currentDialog !== null) return // Only one dialog at a time
    this._currentDialog = new AboutDialog()
    this._currentDialog.init().open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
   * This dialog is shown when the user has pasted an image from the clipboard.
   */
  displayPasteImage () {
    if (this._currentDialog !== null) return // Only one dialog at a time
    this._currentDialog = new PasteImage()
    this._currentDialog.init().open()
    this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
  }

  /**
   * This dialog lets the user edit his/her custom CSS
   */
  displayCustomCss () {
    if (this._currentDialog !== null) return // Only one dialog at a time
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
    if (this._currentDialog !== null) return // Only one dialog at a time
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple instances
    let context = {
      'displaySum': (data.sumMonth > 99999) ? '>100k' : localiseNumber(data.sumMonth),
      'avgMonth': localiseNumber(data.avgMonth),
      'today': localiseNumber(data.today),
      'cmpToday': data.today,
      'cmpAvg': data.avgMonth,
      'cmpAvgHalf': data.avgMonth / 2
    }
    let cnt = makeTemplate('popup', 'stats', context)
    this._currentPopup = popup($('#toolbar .stats'), cnt)
    $('#more-stats').on('click', (e) => {
      // Theres no form but the user has clicked the more button
      this._currentDialog = new StatsDialog()
      this._currentDialog.init(data.wordCount).open()
      this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
      // After opening the dialog, close the popup. The user probably doesn't
      // want to click twice to continue writing.
      this._currentPopup.close()
      this._currentPopup = null
    })
  }

  /**
    * Displays the find-in-file popup.
    * @return {void} Nothing to return.
    */
  displayFind () {
    if (this._currentPopup) this._currentPopup.close(true)
    if (this._renderer.getActiveFile() == null) return
    let regexRE = /^\/.+\/[gimy]{0,4}$/ // It's meta, dude!

    // Now we need to find out if there are selections in the editor that we
    // should respect (i.e. automatically search for this).
    let selections = this._renderer.getEditor().getSelections()
    if (selections.length > 0) this._findPopup.searchVal = selections[0]

    // Create the popup template. Make sure we pre-set the value, if given.
    let cnt = makeTemplate('popup', 'find', {
      'search': this._findPopup.searchVal || '',
      'replace': this._findPopup.replaceVal || ''
    })

    // This must be a persistent popup
    this._currentPopup = popup($('.button.find'), cnt, (x) => {
      // Remove search cursor once the popup is closed
      global.editorSearch.stop()
      this._currentPopup = null
    }) // .makePersistent()

    // If a regular expression was restored to the find popup, make sure to set
    // the respective class.
    if (regexRE.test($('#searchWhat').val())) {
      $('#searchWhat').addClass('regexp')
      $('#replaceWhat').addClass('regexp')
    }

    // Select the search input for convenience
    $('#searchWhat').select()

    // Another convenience: Already highlight all occurrences within the
    // document, if there is content in the find field.
    if ($('#searchWhat').val() !== '') {
      global.editorSearch.highlightOccurrences($('#searchWhat').val())
    }

    $('#searchWhat').on('keyup', (e) => {
      this._findPopup.searchVal = $('#searchWhat').val()
      if (regexRE.test($('#searchWhat').val())) {
        $('#searchWhat').addClass('regexp')
        $('#replaceWhat').addClass('regexp')
      } else {
        $('#searchWhat').removeClass('regexp')
        $('#replaceWhat').removeClass('regexp')
      }

      if (e.which === 13) { // Enter
        $('#searchNext').click()
      }
    })

    $('#replaceWhat').on('keyup', (e) => {
      this._findPopup.replaceVal = $('#replaceWhat').val()
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
      let res = global.editorSearch.next($('#searchWhat').val())
      // Indicate non-successful matches where nothing was found
      if (!res) $('#searchWhat').addClass('not-found')
      else $('#searchWhat').removeClass('not-found')
    })

    $('#replaceNext').click((e) => {
      // If the user hasn't searched before, initate a search beforehand.
      if (!global.editorSearch.hasSearch()) $('#searchNext').click()
      let res = global.editorSearch.replaceNext($('#replaceWhat').val())
      if (!res) $('#searchWhat').addClass('not-found')
      else $('#searchWhat').removeClass('not-found')
    })

    $('#replaceAll').click((e) => {
      global.editorSearch.replaceAll($('#searchWhat').val(), $('#replaceWhat').val())
    })
  }

  /**
    * Displays a popup containing all formattings
    */
  displayFormatting () {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple instances
    let cnt = makeTemplate('popup', 'format')
    this._currentPopup = popup($('.button.formatting'), cnt)

    $('.formatting #header-formatting').on('mousemove', (e) => {
      let elem = $(e.target)
      $('.formatting span').removeClass('active')
      if (!elem.is('span')) {
        $('.formatting #header-formatting').prop('class', 'markdownHeading1')
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
      $('.formatting #header-formatting').prop('class', e.target.className)
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
      this._currentPopup.close()
      this._currentPopup = null
    })
  }

  displayTableGenerator () {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple instances
    let cnt = makeTemplate('popup', 'table')
    this._currentPopup = popup($('.button.formatting'), cnt)

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
      this._currentPopup.close()
      this._currentPopup = null
    })
  }

  /**
    * Displays a table of content.
    * @return {void} (Point of) No return.
    */
  displayTOC () {
    if (this._currentPopup) this._currentPopup.close(true) // Prevent multiple popups
    if (this._renderer.getActiveFile() == null) return

    let toc = this._renderer.getEditor().buildTOC()

    if (toc.length === 0) return

    let idUniquifier = Date.now()

    let cnt = $('<div id="toc-container-' + idUniquifier + '">')
    let h1 = 0
    let h2 = 0
    let h3 = 0
    let h4 = 0
    let h5 = 0
    let h6 = 0
    for (let entry of toc) {
      let level = ''
      switch (entry.level) {
        case 1:
          h1++
          h2 = h3 = h4 = h5 = h6 = 0
          level = h1
          break
        case 2:
          h2++
          h3 = h4 = h5 = h6 = 0
          level = [ h1, h2 ].join('.')
          break
        case 3:
          h3++
          h4 = h5 = h6 = 0
          level = [ h1, h2, h3 ].join('.')
          break
        case 4:
          h4++
          h5 = h6 = 0
          level = [ h1, h2, h3, h4 ].join('.')
          break
        case 5:
          h5++
          h6 = 0
          level = [ h1, h2, h3, h4, h5 ].join('.')
          break
        case 6:
          h6++
          level = [ h1, h2, h3, h4, h5, h6 ].join('.')
      }

      cnt.append(
        $('<a>').text(level + '. ' + entry.text)
          .attr('data-line', entry.line)
          .attr('href', '#')
          .addClass('toc-link')
      )
    }

    this._currentPopup = popup($('.button.show-toc'), cnt)

    // On click jump to line
    $('.toc-link').click((event) => {
      let elem = $(event.target)
      this._renderer.getEditor().jtl(elem.attr('data-line'))
    })

    // Sortable
    $('#toc-container-' + idUniquifier).sortable({
      axis: 'y',
      items: '> .toc-link',
      update: (event, ui) => {
        // The user has dropped the item someplace else.
        let newIndex = ui.item.index()
        let originalLine = parseInt(ui.item.attr('data-line'))
        let sumLength = $('#toc-container-' + idUniquifier + ' > .toc-link').length
        if (newIndex < sumLength - 1) {
          let elementBelow = $('#toc-container-' + idUniquifier + ' > .toc-link').eq(newIndex + 1)
          let aboveLine = parseInt(elementBelow.attr('data-line'))
          this._renderer.getEditor().moveSection(originalLine, aboveLine)
        } else {
          this._renderer.getEditor().moveSection(originalLine, -1)
        }

        // Cool, now destroy the sortable, rebuild the TOC, and re-fill the div
        // again.
        $('#toc-container-' + idUniquifier).sortable('destroy')
        this._currentPopup.close()
        this._currentPopup = null
        this.displayTOC()
      }
    })
  }

  displayDevClipboard () {
    // DevClipboard
    if (this._currentDialog !== null) return // Only one dialog at a time
    if (this._currentPopup) this._currentPopup.close(true) // Close popups
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
