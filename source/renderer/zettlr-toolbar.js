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

const tippy = require('tippy.js').default
const localiseNumber = require('../common/util/localise-number')
const renderTemplate = require('./util/render-template')
const { trans } = require('../common/lang/i18n')

const { ipcRenderer } = require('electron')

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
    this._build()

    // Searchbar autocomplete variables
    this._autocomplete = []
    this._oldval = ''

    /**
     * Contains the update data, if any
     *
     * @var {Object}
     */
    this._updateData = null

    // Holds the last received fileInfo object
    this._lastFileInfo = null

    // If an update is in progress, this contains the progress
    this._downloadProgress = undefined

    this._act()

    setTimeout(() => {
      // Send an initial check for an update
      ipcRenderer.send('update-provider', {
        'command': 'update-check',
        'content': {}
      })
    }, 10000)

    ipcRenderer.on('update-provider', (event, data) => {
      let { command, content } = data

      if (command === 'update-data') {
        // New data from the provider
        this._updateData = content
        this._onUpdateData() // Update the toolbar accordingly
      } else if (command === 'download-progress') {
        this._downloadProgress = content
        let progress = document.getElementById('app-update-progress')
        let progressPercent = document.getElementById('app-update-progress-percent')
        let progressEta = document.getElementById('app-update-progress-eta')
        if (progress && progressPercent) {
          progress.setAttribute('max', this._downloadProgress.size_total)
          progress.setAttribute('value', this._downloadProgress.size_downloaded)
          progressPercent.textContent = this._downloadProgress.download_percent + ' %'
          let seconds = this._downloadProgress.eta_seconds
          if (seconds > 60) {
            progressEta.textContent = '(' + Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's)'
          } else {
            progressEta.textContent = '(' + seconds + 's)'
          }
        }
        if (this._downloadProgress.finished === false) {
          setTimeout(() => {
            ipcRenderer.send('update-provider', {
              'command': 'download-progress',
              'content': null
            })
          }, 1000)
        } // end if
      }
    })
  }

  /**
   * Returns the toolbar container
   *
   * @return  {Element}  The toolbar container
   */
  get container () {
    return document.getElementById('toolbar')
  }

  /**
   * Returns the file information element
   *
   * @return  {Element}  The file information container
   */
  get fileInfo () {
    return this.container.querySelector('.file-info')
  }

  /**
   * Returns the search bar's input element
   *
   * @return  {HTMLInputElement}  The input
   */
  get searchBarInput () {
    return this.container.querySelector('.searchbar').querySelector('input')
  }

  /**
   * Returns the "end search" button element
   *
   * @return  {HTMLButtonElement}  The end search button element
   */
  get endSearchButton () {
    return this.container.querySelector('.searchbar').querySelector('.end-search')
  }

  /**
   * Returns the search progress indicator
   *
   * @return  {SVGElement}  The SVG of the search progress
   */
  get searchProgressIndicator () {
    return document.getElementById('search-progress-indicator')
  }

  /**
   * Returns the miscellaneous container
   *
   * @return  {Element}  The container element
   */
  get miscellaneousContainer () {
    return document.getElementById('toolbar-misc-buttons')
  }

  /**
     * Activate event listeners
     * @return {void} Nothing to return.
     */
  _act () {
    // Activate search function.
    this.searchBarInput.addEventListener('keyup', (e) => {
      // In case the user is using an IME (for non-latin script) autocomplete
      // will not work correctly due to the way IMEs compose the letters. Which
      // is the keyword here, because if the isComposing flag is set, simply
      // don't handle that event and wait for the compositionend-event to fire
      // on the textfield for the magic to happen!
      if (e.isComposing) return
      // Check for non triggering keys
      if (NON_TRIGGERING_KEYS.includes(e.key)) return

      if (e.key === 'Escape') {
        this.searchBarInput.blur()
        this.searchBarInput.value = ''
        this._renderer.exitSearch()
      } else if (e.key === 'Enter') {
        this._renderer.beginSearch(this.searchBarInput.value)
        this.searchBarInput.select() // Select everything in the area.
      } else {
        this._applyAutocomplete()
      }
    })

    // Listen for the event fired if an IME is done composing something
    this.searchBarInput.addEventListener('compositionend', () => {
      this._applyAutocomplete()
    })

    this.searchBarInput.addEventListener('dblclick', (e) => {
      e.stopPropagation()
    })

    this.endSearchButton.addEventListener('click', () => {
      this.searchBarInput.blur()
      this.searchBarInput.value = ''
      this._renderer.exitSearch()
    })

    this.searchBarInput.addEventListener('focus', () => {
      this._autocomplete = this._renderer.getFilesInDirectory()
      if (this.searchBarInput.value === '') {
        // Let's prefill this with the selection from the editor if possible.
        let selections = this._renderer.getEditor().getSelections()
        if (selections.length > 0) {
          this.searchBarInput.value = selections[0]
          this.searchBarInput.select() // Ease of access
        }
      }
    })

    this.searchBarInput.addEventListener('blur', () => {
      this._autocomplete = [] // Reset auto completion array
      this._oldval = ''
    })

    this.fileInfo.addEventListener('click', () => {
      this._renderer.getBody().showFileInfo()
    })

    // Activate buttons
    // -- so beautifully DRY <3
    this.container.querySelectorAll('.button').forEach((elem, key, parent) => {
      elem.addEventListener('click', (e) => {
        // Don't let the event bubble up to the document. Why? Because if a popup
        // opens up and the event reaches the document element this will cause the
        // popup to think it should close itself again.
        e.stopPropagation()
        this._renderer.handleEvent(elem.dataset['command'], elem.dataset['content'])
      })
    })

    // On platforms other than darwin, a menu button is used to show the app's
    // menu, so the button will receive focus and thereby draw it from any other
    // element currently focused. Normally, the workflow for actions requiring
    // textareas/inputs to be focused, will be: click the respective input ->
    // click the respective menu action. Here, we make sure this succeeds, as we
    // re-focus any formerly focused element if the menu button receives focus
    // to make sure, for instance, the paste event for new file IDs will have a
    // receiving end for the paste action.
    let menuPopup = this.container.querySelector('.menu-popup')
    if (menuPopup) {
      menuPopup.addEventListener('focus', (e) => {
        // Re-focus the former element
        e.relatedTarget.focus()
      })
    }

    // Toggle the maximisation status of the main window
    this.container.addEventListener('dblclick', () => {
      global.ipc.send('win-maximise')
    })

    // Tippify all elements with the respective attribute.
    tippy('#toolbar [data-tippy-content]', {
      delay: 100,
      arrow: true,
      duration: 100
    })
  }

  /**
   * Called whenever there's new update data from the update provider
   */
  _onUpdateData () {
    // Update the toolbar according to the status of the update data
    if (this._updateData !== null && this._updateData.isNewer === true) {
      let button = document.createElement('div')
      button.classList.add('button')
      button.setAttribute('id', 'update-info-button')
      button.innerHTML = '<clr-icon shape="download-cloud" class="is-success"></clr-icon>'
      this.miscellaneousContainer.appendChild(button)

      let instance = tippy(button, {
        content: `Update to version ${this._updateData.newVer} available`,
        delay: 100,
        arrow: true,
        duration: 100
      })

      // Show the tippy for 3 seconds to get the user's attention
      instance.show()
      setTimeout(() => {
        instance.hide()
        instance.setContent('Update available')
      }, 3000)

      button.addEventListener('click', (e) => {
        e.stopPropagation()

        if (this._downloadProgress !== undefined) {
          // We have a download progress to show
          global.popupProvider.show('update-progress', button, this._downloadProgress)

          document.getElementById('begin-update-progress-button').addEventListener('click', (e) => {
            ipcRenderer.send('update-provider', {
              'command': 'begin-update',
              'content': null
            })
          })
        } else {
          // No download progress, so display the normal popup
          global.popupProvider.show('update', button, this._updateData)

          // Enable listening for update requests
          let requestButtons = document.querySelectorAll('.request-app-update')

          requestButtons.forEach((button, key, parent) => {
            button.addEventListener('click', (e) => {
              let url = button.dataset['url']
              ipcRenderer.send('update-provider', {
                'command': 'request-app-update',
                'content': url
              })
              global.popupProvider.close()

              // Now, send a request for the download progress data, and poll on
              // each update until it is finished
              ipcRenderer.send('update-provider', {
                'command': 'download-progress',
                'content': null
              })
            })
          })
        }

        // Display the changelog, if requested. Available in all popups
        document.getElementById('view-changelog-button').addEventListener('click', (e) => {
          this._renderer.getBody().displayUpdate({
            'newVer': this._updateData.newVer,
            'curVer': this._updateData.curVer,
            'isBeta': this._updateData.isBeta,
            'changelog': this._updateData.changelog
          })
          global.popupProvider.close()
        })
      })
    } else {
      // No update available, remove button if applicable
      let button = document.getElementById('update-info-button')
      if (button) button.parentElement.removeChild(button)
    }
  }

  /**
   * Applies autocorrect to the global search area. This code has been
   * outsourced from the keyup event listener, because it also needs to be
   * executed after the endcomposing-event fires.
   */
  _applyAutocomplete () {
    let elem = this.searchBarInput
    if ((elem.value === '') || (elem.value === this._oldval)) return // Content has not changed

    // First, get the current value of the searchbar
    this._oldval = elem.value

    // Then test if the current value equals the (lowercased) beginning of any
    // autocorrect name we have in memory. If it does, replace it and select
    // everything afterwards.
    for (let name of this._autocomplete) {
      if (name.substr(0, this._oldval.length).toLowerCase() === this._oldval.toLowerCase()) {
        elem.value = this._oldval + name.substr(this._oldval.length)
        elem.setSelectionRange(this._oldval.length, elem.value.length)
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
      let child = document.createElement('div')
      child.classList.add(elem.role)
      if (elem.role === 'button') {
        child.classList.add(elem.class)
        child.setAttribute('data-command', elem.command)
        child.setAttribute('data-content', elem.content)
      } else if (elem.role === 'searchbar') {
        child.innerHTML = '<input type="text"><div class="end-search">&times;</div>'
      } else if (elem.role === 'pomodoro') {
        child.classList.add('button')
        child.setAttribute('data-command', 'pomodoro')
        child.innerHTML = '<svg width="20" height="20" viewBox="-1 -1 2 2"><circle class="pomodoro-meter" cx="0" cy="0" r="1" shape-rendering="geometricPrecision"></circle><path d="" fill="" class="pomodoro-value" shape-rendering="geometricPrecision"></path></svg>'
      }
      if (elem.hasOwnProperty('title')) child.setAttribute('data-tippy-content', trans(elem.title))
      if (elem.hasOwnProperty('icon') && typeof elem.icon === 'string') {
        child.innerHTML = `<clr-icon shape="${elem.icon}"></clr-icon>`
      }
      this.container.appendChild(child)
    }

    // Final actions after the toolbar has been set up
    this.searchBarInput.setAttribute('placeholder', trans('dialog.find.find_placeholder'))

    // Create the progress indicator circle and insert it hidden
    let searchProgressIndicator = renderTemplate('<svg id="search-progress-indicator" class="hidden" width="20" height="20" viewBox="-1 -1 2 2"><circle class="indicator-meter" cx="0" cy="0" r="1" shape-rendering="geometricPrecision"></circle><path d="" fill="" class="indicator-value" shape-rendering="geometricPrecision"></path></svg>')
    this.container.querySelector('.searchbar').after(searchProgressIndicator)

    // Insert a div container for additional buttons that may or may not be
    // part of the toolbar (e.g. dynamics)
    let miscellaneousContainer = document.createElement('div')
    miscellaneousContainer.setAttribute('id', 'toolbar-misc-buttons')
    this.container.appendChild(miscellaneousContainer)
  }

  /**
    * Updates the word count in the info area
    * @param  {Object} fileInfo fileInfo object.
    * @return {void}       Nothing to return
    */
  updateFileInfo (fileInfo = this._lastFileInfo) {
    this._lastFileInfo = fileInfo
    let cnt = ''

    if (fileInfo.selections.length > 0) {
      // We have selections to display.
      let length = 0
      fileInfo.selections.forEach(sel => {
        length += sel.selectionLength
      })

      cnt = trans('gui.words_selected', localiseNumber(length))
      cnt += '<br>'
      if (fileInfo.selections.length === 1) {
        cnt += (this._lastFileInfo.selections[0].start.line + 1) + ':'
        cnt += (this._lastFileInfo.selections[0].start.ch + 1) + ' &ndash; '
        cnt += (this._lastFileInfo.selections[0].end.line + 1) + ':'
        cnt += (this._lastFileInfo.selections[0].end.ch + 1)
      } else {
        // Multiple selections --> indicate
        cnt += trans('gui.number_selections', this._lastFileInfo.selections.length)
      }
    } else {
      // No selection. NOTE: words always contains the count of chars OR words.
      cnt = trans('gui.words', localiseNumber(this._lastFileInfo.words))
      cnt += '<br>'
      cnt += (this._lastFileInfo.cursor.line + 1) + ':' + (this._lastFileInfo.cursor.ch + 1)
    }

    this.fileInfo.innerHTML = `<p>${cnt}</p>`
  }

  /**
    * Hides the word count
    * @return {ZettlrToolbar} Chainability.
    */
  hideWordCount () {
    this.fileInfo.textContent = ''
    return this
  }

  /**
    * Toggles the distraction free's mute class on the toolbar.
    * @return {ZettlrToolbar} This for chainability.
    */
  toggleDistractionFree () {
    this.container.classList.toggle('mute')
    return this
  }

  /**
    * Focuses the search area
    * @return {ZettlrToolbar} Chainability.
    */
  focusSearch () {
    this.searchBarInput.focus()
    this.searchBarInput.select()
    return this
  }

  /**
    * Overrides the current contents of the searchbar.
    * @param {String} term The new value to be written into the searchbar.
    */
  setSearch (term) {
    this.searchBarInput.value = term
  }

  getSearchTerm () {
    return this.searchBarInput.value
  }

  /**
    * Progresses the search indicator
    * @param  {Integer} item    Current items that have been searched
    * @param  {Integer} itemCnt Overall amount of items to be searched
    * @return {void}         Nothing to return.
    */
  searchProgress (item, itemCnt) {
    if (this.searchProgressIndicator.classList.contains('hidden')) {
      this.searchProgressIndicator.classList.remove('hidden')
    } else {
      let progress = item / itemCnt
      let large = (progress > 0.5) ? 1 : 0
      let x = Math.cos(2 * Math.PI * progress)
      let y = Math.sin(2 * Math.PI * progress)

      this.searchProgressIndicator
        .querySelector('.indicator-value')
        .setAttribute('d', `M 1 0 A 1 1 0 ${large} 1 ${x} ${y} L 0 0`)
    }
  }

  /**
    * Ends the search by resetting the indicator
    * @return {void} Nothing to return.
    */
  endSearch () {
    this.searchProgressIndicator.classList.add('hidden')
  }
}

module.exports = ZettlrToolbar
