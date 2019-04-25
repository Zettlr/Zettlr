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

const { trans } = require('../common/lang/i18n.js')
const { localiseNumber } = require('../common/zettlr-helpers.js')

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
      if (event.ctrlKey || event.altKey) {
        metaElements.addClass('meta-key')
      } else {
        metaElements.removeClass('meta-key')
      }
    })

    // Inject a global notify and notifyError function
    global.notify = (msg) => { this.notify(msg) }
    global.notifyError = (msg) => { this.notifyError(msg) }

    // Afterwards, activate the event listeners of the window controls
    $('.windows-window-controls .minimise, .linux-window-controls .minimise').click((e) => {
      global.ipc.send('win-minimise')
    })
    $('.windows-window-controls .resize, .linux-window-controls .maximise').click((e) => {
      global.ipc.send('win-maximise')
    })
    $('.windows-window-controls .close, .linux-window-controls .close').click((e) => {
      global.ipc.send('win-close')
    })
  }

  /**
   * Is called by the app on a configuration change so that the body can make
   * necessary adjustments.
   */
  configChange () {
    // On config change, change the theme according to the settings
    let href = $('link#theme-css').attr('href')
    href = href.replace(/bielefeld|berlin|frankfurt/, global.config.get('display.theme'))
    $('link#theme-css').attr('href', href)
  }

  /**
    * Display a small popup to ask for a new file name
    * @param  {ZettlrDir} dir A directory object
    * @return {void}     Nothing to return.
    */
  requestFileName (dir) {
    // No directory selected.
    if (!dir) return

    // It was a virtual directory, not an actual directory.
    if (dir.type !== 'directory') return

    let cnt = makeTemplate('popup', 'textfield', {
      'val': trans('dialog.file_new.value'),
      'placeholder': trans('dialog.file_new.placeholder')
    })

    popup($('.button.file-new'), cnt, (form) => {
      if (form) {
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
    if (!dir) return

    // It was a virtual directory, not an actual directory.
    if (dir.type !== 'directory') return

    let elem

    // Selection method stolen from requestNewDirName
    if (!$('#combiner').hasClass('expanded') && $('#directories').hasClass('hidden')) {
      // The combiner is in thin mode and directories is hidden, so the file list
      // is visible -> find the div in there. (Should be the top containing dir)
      elem = $('#preview').find('li[data-hash="' + dir.hash + '"]').first()
    } else {
      // The combiner is in extended mode and/or the tree view is visible.
      elem = $('#directories').find('li[data-hash="' + dir.hash + '"]').first()
    }

    // In case the combiner was not in an extended mode and the preview list did
    // not contain the directory fall back to the combiner element itself. But
    // this should normally never happen.
    if (elem.length === 0) elem = $('#combiner')

    let cnt = makeTemplate('popup', 'textfield', {
      'val': trans('dialog.dir_new.value'),
      'placeholder': trans('dialog.dir_new.placeholder')
    })

    popup(elem, cnt, (form) => {
      if (form) {
        global.ipc.send('dir-new', { 'name': form[0].value, 'hash': dir.hash })
      }
    })
  }

  /**
    * Requests a directory name for a new virtual directory
    * @param  {ZettlrDir} dir The parent directory object.
    * @return {void}     Nothing to return.
    */
  requestVirtualDirName (dir) {
    if (!dir) {
      return // No directory selected.
    }

    let cnt = makeTemplate('popup', 'textfield', {
      'val': trans('dialog.dir_new.value'),
      'placeholder': trans('dialog.dir_new.placeholder')
    })

    popup($(`[data-hash=${dir.hash}]`), cnt, (form) => {
      if (form) {
        global.ipc.send('dir-new-vd', { 'name': form[0].value, 'hash': dir.hash })
      }
    })
  }

  /**
    * Display a small popup to ask for a new dir name for an already existing.
    * @param  {ZettlrDir} dir The directory to be renamed
    * @return {void}     Nothing to return.
    */
  requestNewDirName (dir) {
    let elem = $('#directories').find('li[data-hash="' + dir.hash + '"]').first()
    let cnt = makeTemplate('popup', 'textfield', {
      'val': dir.name,
      'placeholder': trans('dialog.dir_rename.placeholder')
    })

    popup(elem, cnt, (form) => {
      if (form) {
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
    if (this._renderer.getCurrentFile() != null && this._renderer.getCurrentFile().hash === file.hash) {
      elem = $('.button.file-rename')
    } else {
      elem = $('#preview').find('li[data-hash="' + file.hash + '"]').first()
      if (elem.length === 0) {
        // Obviously the file is standalone
        elem = $('#directories').find('div[data-hash="' + file.hash + '"]').first()
      }
    }

    let cnt = makeTemplate('popup', 'textfield', {
      'val': file.name,
      'placeholder': trans('dialog.file_rename.placeholder')
    })

    popup(elem, cnt, (form) => {
      if (form) {
        global.ipc.send('file-rename', { 'name': form[0].value, 'hash': file.hash })
      }
    })
  }

  /**
   * Shows the popup to set or update a target on a file.
   * @param {number} hash The hash for which the popup should be shown.
   */
  setTarget (hash) {
    let file = this._renderer.findObject(hash)
    if (!file) return // No file given

    let targetMode = 'words'
    let targetCount = 0

    if (file.hasOwnProperty('target') && file.target !== null) {
      // Overwrite the properties with the ones given
      targetMode = file.target.mode
      targetCount = file.target.count
    }

    let cnt = makeTemplate('popup', 'target', {
      'mode': targetMode,
      'count': targetCount
    })

    popup($(`[data-hash=${hash}]`), cnt, (form) => {
      if (form) {
        global.ipc.send('set-target', {
          'hash': parseInt(hash),
          'mode': form[1].value,
          'count': parseInt(form[0].value)
        })
      }
    })
  }

  /**
    * Displays file information (such as word count etc)
    * @return {ZettlrPopup} The popup that is shown.
    */
  showFileInfo () {
    let info = this._renderer.getEditor().getFileInfo()

    let data = {
      'words': localiseNumber(info.words),
      'chars': localiseNumber(info.chars),
      'chars_wo_spaces': localiseNumber(info.chars_wo_spaces),
      'words_sel': (info.words_sel) ? localiseNumber(info.words_sel) : null,
      'chars_sel': (info.chars_sel) ? localiseNumber(info.chars_sel) : null
    }

    let cnt = makeTemplate('popup', 'file-info', data)
    return popup($('#toolbar .file-info'), cnt)
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
    // Create a popup

    let cnt = makeTemplate('popup', 'export', { 'hash': file.hash })
    if (!cnt) return this

    let p = popup($('.button.share'), cnt)

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
      p.close()
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
    let context = {
      'displaySum': (data.sumMonth > 99999) ? '>100k' : localiseNumber(data.sumMonth),
      'avgMonth': localiseNumber(data.avgMonth),
      'today': localiseNumber(data.today),
      'cmpToday': data.today,
      'cmpAvg': data.avgMonth,
      'cmpAvgHalf': data.avgMonth / 2
    }
    let cnt = makeTemplate('popup', 'stats', context)
    let p = popup($('#toolbar .stats'), cnt)
    $('#more-stats').on('click', (e) => {
      // Theres no form but the user has clicked the more button
      this._currentDialog = new StatsDialog()
      this._currentDialog.init(data.wordCount).open()
      this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
      // After opening the dialog, close the popup. The user probably doesn't
      // want to click twice to continue writing.
      p.close()
    })
  }

  /**
    * Displays the find-in-file popup.
    * @return {void} Nothing to return.
    */
  displayFind () {
    if (this._renderer.getCurrentFile() === null) return
    let regexRE = /^\/.*\/[gimy]{0,4}$/ // It's meta, dude!

    // Create the popup template. Make sure we pre-set the value, if given.
    let cnt = makeTemplate('popup', 'find', {
      'search': this._findPopup.searchVal || '',
      'replace': this._findPopup.replaceVal || ''
    })

    // This must be a persistent popup
    popup($('.button.find'), cnt, (x) => {
      // Cache the current values.
      this._findPopup = {
        'searchVal': $('#searchWhat').val(),
        'replaceVal': $('#replaceWhat').val()
      }
      // Remove search cursor once the popup is closed
      this._renderer.getEditor().stopSearch()
    }).makePersistent()

    // If a regular expression was restored to the find popup, make sure to set
    // the respective class.
    if (regexRE.test($('#searchWhat').val())) {
      $('#searchWhat').addClass('regexp')
    }

    $('#searchWhat').on('keyup', (e) => {
      if (regexRE.test($(e.target).val())) {
        $(e.target).addClass('regexp')
      } else {
        $(e.target).removeClass('regexp')
      }

      if (e.which === 13) { // Enter
        e.preventDefault()
      }
    })

    $('#replaceWhat').on('keyup', (e) => {
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
      this._renderer.getEditor().searchNext($('#searchWhat').val())
    })

    $('#replaceNext').click((e) => {
      this._renderer.getEditor().replaceNext($('#replaceWhat').val())
      // Immediately highlight the next search result
      this._renderer.getEditor().searchNext($('#searchWhat').val())
    })

    $('#replaceAll').click((e) => {
      this._renderer.getEditor().replaceAll($('#searchWhat').val(), $('#replaceWhat').val())
    })
  }

  /**
    * Displays a popup containing all formattings
    */
  displayFormatting () {
    let cnt = makeTemplate('popup', 'format')
    let p = popup($('.button.formatting'), cnt)

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
      $('.formatting span').removeClass('active')
      this._renderer.handleEvent('cm-command', e.target.className)
      p.close()
    })
  }

  /**
    * Returns the renderer
    * @return {ZettlrRenderer} The renderer object
    */
  getRenderer () { return this._renderer }
}

module.exports = ZettlrBody
