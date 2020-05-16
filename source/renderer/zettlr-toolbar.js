/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrToolbar class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles the toolbar
 *
 * END HEADER
 */

const localiseNumber = require('../common/util/localise-number')
const { trans } = require('../common/lang/i18n')

/**
 * The following keys do not trigger the autocomplete on the searchbar
 */
const NON_TRIGGERING_KEYS = [
  'Alt', 'AltGraph', 'CapsLock', 'Control', 'Fn', 'FnLock', 'Hyper', 'Meta',
  'NumLock', 'ScrollLock', 'Shift', 'Super', 'ArrowDown', 'ArrowLeft',
  'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', 'Backspace',
  'Delete', 'Insert', 'Undo', 'Redo', 'Copy', 'Paste', 'Cut'
]

/**
 * This class is responsible for rendering the Toolbar. It builds the toolbar
 * based on the toolbar.json file in the assets directory. Therefore one can
 * think of hooks to implement buttons dynamically in the future (e.g., for
 * plugins).
 */
class ZettlrToolbar {
  /**
     * Initialize the toolbar handlers and activate
     * @param {ZettlrRenderer} parent The renderer object
     */
  constructor (parent) {
    this._renderer = parent
    this._div = $('#toolbar')
    this._build()
    this._searchbar = this._div.find('.searchbar').first().find('input').first()
    this._searchbar.attr('placeholder', trans('dialog.find.find_placeholder'))
    this._fileInfo = this._div.find('.file-info')

    // Create the progress indicator circle and insert it hidden
    this._searchProgress = $('<svg id="search-progress-indicator" class="hidden" width="20" height="20" viewBox="-1 -1 2 2"><circle class="indicator-meter" cx="0" cy="0" r="1" shape-rendering="geometricPrecision"></circle><path d="" fill="" class="indicator-value" shape-rendering="geometricPrecision"></path></svg>')
    this._searchProgress.insertAfter($('#toolbar .searchbar').first())
    // Searchbar autocomplete variables
    this._autocomplete = []
    this._oldval = ''

    // Stores the mode of the word counter
    this._fileInfoMode = 'words' // can be "words" or "cursor"
    this._lastFileInfo = null // Holds the last received fileInfo object

    this._act()
  }

  /**
     * Activate event listeners
     * @return {void} Nothing to return.
     */
  _act () {
    // Activate search function.
    this._searchbar.on('keyup', (e) => {
      // In case the user is using an IME (for non-latin script) autocomplete
      // will not work correctly due to the way IMEs compose the letters. Which
      // is the keyword here, because if the isComposing flag is set, simply
      // don't handle that event and wait for the compositionend-event to fire
      // on the textfield for the magic to happen!
      if (e.originalEvent.isComposing) return
      // Check for non triggering keys
      if (NON_TRIGGERING_KEYS.includes(e.key)) return

      if (e.key === 'Escape') {
        this._searchbar.blur()
        this._searchbar.val('')
        this._renderer.exitSearch()
      } else if (e.key === 'Enter') {
        this._renderer.beginSearch(this._searchbar.val())
        this._searchbar.select() // Select everything in the area.
      } else {
        this._applyAutocomplete()
      }
    })

    // Listen for the event fired if an IME is done composing something
    this._searchbar.on('compositionend', (e) => {
      // Composition has ended, so we can apply autocomplete!
      this._applyAutocomplete()
    })

    this._searchbar.on('dblclick', (e) => { e.stopPropagation() })

    this._div.find('.end-search').on('click', (e) => {
      this._searchbar.blur()
      this._searchbar.val('')
      this._renderer.exitSearch()
    })

    this._searchbar.on('focus', (e) => {
      this._autocomplete = this._renderer.getFilesInDirectory()
      if (this._searchbar[0].value === '') {
        // Let's prefill this with the selection from the editor if possible.
        let selections = this._renderer.getEditor().getSelections()
        if (selections.length > 0) {
          this._searchbar[0].value = selections[0]
          this._searchbar[0].select() // Ease of access
        }
      }
    })

    this._searchbar.on('blur', (e) => {
      this._autocomplete = [] // Reset auto completion array
      this._oldval = ''
    })

    this._fileInfo.click((e) => {
      this._renderer.getBody().showFileInfo()
    })

    this._fileInfo.contextmenu((e) => {
      e.stopPropagation()
      e.preventDefault()
      // Switch to line:ch-display
      if (this._fileInfoMode === 'words') this._fileInfoMode = 'cursor'
      else this._fileInfoMode = 'words'
      this.updateFileInfo()
    })

    // Activate buttons
    // -- so beautifully DRY <3
    this._div.find('.button').on('click', (e) => {
      // Don't let the event bubble up to the document. Why? Because if a popup
      // opens up and the event reaches the document element this will cause the
      // popup to think it should close itself again.
      e.stopPropagation()
      let elem = $(e.currentTarget)
      let command = elem.attr('data-command') || 'unknown-command'
      let content = elem.attr('data-content') || {}

      this._renderer.handleEvent(command, content)
    })

    // On platforms other than darwin, a menu button is used to show the app's
    // menu, so the button will receive focus and thereby draw it from any other
    // element currently focused. Normally, the workflow for actions requiring
    // textareas/inputs to be focused, will be: click the respective input ->
    // click the respective menu action. Here, we make sure this succeeds, as we
    // re-focus any formerly focused element if the menu button receives focus
    // to make sure, for instance, the paste event for new file IDs will have a
    // receiving end for the paste action.
    this._div.find('.menu-popup').on('focus', (e) => {
      // Re-focus the former element
      $(e.relatedTarget).focus()
    })

    // Toggle the maximisation status of the main window
    this._div.on('dblclick', (e) => {
      global.ipc.send('win-maximise')
    })

    // Tippify all elements with the respective attribute.
    global.tippy('#toolbar [data-tippy-content]', {
      delay: 100,
      arrow: true,
      duration: 100
    })
  }

  /**
   * Applies autocorrect to the global search area. This code has been
   * outsources from the keyup event listener, because it also needs to be
   * executed after the endcomposing-event fires.
   */
  _applyAutocomplete () {
    let elem = this._searchbar[0]
    if ((elem.value === '') || (elem.value === this._oldval)) return // Content has not changed

    // First, get the current value of the searchbar
    this._oldval = elem.value

    // Then test if the current value equals the (lowercased) beginning of any
    // autocorrect name we have in memory. If it does, replace it and select
    // everything afterwards.
    for (let name of this._autocomplete) {
      if (name.substr(0, this._oldval.length).toLowerCase() === this._oldval.toLowerCase()) {
        elem.value = this._oldval + name.substr(this._oldval.length)
        if (elem.setSelectionRange) {
          elem.setSelectionRange(this._oldval.length, elem.value.length)
        }
        break
      }
    }
    this._oldval = elem.value // Now this is the "old value"
  }

  /**
    * This builds the toolbar
    * @return {void} No return.
    */
  _build () {
    let tpl = require('./assets/toolbar/toolbar.json').toolbar

    // Append everything to the div.
    for (let elem of tpl) {
      // Some buttons are only for certain platforms, so don't show them on the
      // wrong one.
      if (elem.context && !elem.context.includes(process.platform)) continue

      let child = $('<div>').addClass(elem.role)
      if (elem.role === 'button') {
        child.addClass(elem.class)
        child.attr('data-command', elem.command)
        child.attr('data-content', elem.content)
      } else if (elem.role === 'searchbar') {
        child.html('<input type="text"><div class="end-search">&times;</div>')
      } else if (elem.role === 'pomodoro') {
        child.addClass('button')
        child.attr('data-command', 'pomodoro')
        child.html('<svg width="20" height="20" viewBox="-1 -1 2 2"><circle class="pomodoro-meter" cx="0" cy="0" r="1" shape-rendering="geometricPrecision"></circle><path d="" fill="" class="pomodoro-value" shape-rendering="geometricPrecision"></path></svg>')
      }
      if (elem.title) child.attr('data-tippy-content', trans(elem.title))
      if (elem.icon && typeof elem.icon === 'string') {
        child.html(`<clr-icon shape="${elem.icon}"></clr-icon>`)
      }
      this._div.append(child)
    }
  }

  /**
    * Updates the word count in the info area
    * @param  {Object} fileInfo fileInfo object.
    * @return {void}       Nothing to return
    */
  updateFileInfo (fileInfo = this._lastFileInfo) {
    this._lastFileInfo = fileInfo
    if (this._lastFileInfo.words === 0) return this.hideWordCount()

    if (this._fileInfoMode === 'words') {
      this._fileInfo.text(trans('gui.words', localiseNumber(this._lastFileInfo.words)))
    } else if (this._fileInfoMode === 'cursor') {
      this._fileInfo.text(`${this._lastFileInfo.cursor.line}:${this._lastFileInfo.cursor.ch}`)
    }
  }

  /**
    * Hides the word count
    * @return {ZettlrToolbar} Chainability.
    */
  hideWordCount () {
    this._fileInfo.text('')
    return this
  }

  /**
    * Toggles the distraction free's mute class on the toolbar.
    * @return {ZettlrToolbar} This for chainability.
    */
  toggleDistractionFree () {
    this._div.toggleClass('mute')
    return this
  }

  /**
    * Focuses the search area
    * @return {ZettlrToolbar} Chainability.
    */
  focusSearch () {
    this._searchbar.focus()
    this._searchbar.select()
    return this
  }

  /**
    * Overrides the current contents of the searchbar.
    * @param {String} term The new value to be written into the searchbar.
    */
  setSearch (term) {
    this._searchbar.val(term)
  }

  /**
    * Progresses the search indicator
    * @param  {Integer} item    Current items that have been searched
    * @param  {Integer} itemCnt Overall amount of items to be searched
    * @return {void}         Nothing to return.
    */
  searchProgress (item, itemCnt) {
    if (this._searchProgress.hasClass('hidden')) {
      this._searchProgress.removeClass('hidden')
    } else {
      let progress = item / itemCnt
      let large = (progress > 0.5) ? 1 : 0
      let x = Math.cos(2 * Math.PI * progress)
      let y = Math.sin(2 * Math.PI * progress)
      this._searchProgress.find('.indicator-value').attr('d', `M 1 0 A 1 1 0 ${large} 1 ${x} ${y} L 0 0`)
    }
  }

  /**
    * Ends the search by resetting the indicator
    * @return {void} Nothing to return.
    */
  endSearch () {
    this._searchProgress.addClass('hidden')
  }
}

module.exports = ZettlrToolbar
