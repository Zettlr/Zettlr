/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrPreview class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the file list in the preview pane.
 *
 * END HEADER
 */

const Clusterize = require('clusterize.js')
const tippy = require('tippy.js')
const { formatDate, flattenDirectoryTree, hash, localiseNumber } = require('../common/zettlr-helpers.js')
const { trans } = require('../common/lang/i18n.js')
// Sorting icons (WebHostingHub-Glyphs)
const SORT_NAME_UP = '&#xf1c2;'
const SORT_NAME_DOWN = '&#xf1c1;'
const SORT_TIME_UP = '&#xf1c3;'
const SORT_TIME_DOWN = '&#xf1c4;'

/**
 * This class represents the file tree as a two-dimensional list. It makes use
 * of the ListView class to actually render the list. It is rather similar to
 * the ZettlrDirectories class, but ZettlrPreview handles searches as well,
 * which makes the big share of the class's functionality.
 */
class ZettlrPreview {
  /**
    * Initialize
    * @param {ZettlrRenderer} parent The renderer object
    */
  constructor (parent) {
    this._renderer = parent
    this._snippets = false
    this._hideDirs = false
    this._selectedFile = null

    this._data = [] // The whole data (as returned by _renderer.getCurrentDir())
    this._tags = [] // Only the rendered elements (may exclude some)
    this._keywords = [] // YAY good programming style, why do I have two attributes translating to "tags"?

    // Elements
    this._div = $('#preview')
    this._listContainer = $('<ul>').attr('id', 'filelist').appendTo(this._div)
    this._list = new Clusterize({
      rows: this._data,
      scrollId: 'preview',
      contentId: 'filelist',
      show_no_data_row: false, // Don't show a "no data" element
      callbacks: {
        // Draggables need to be created from existing DOM elements
        clusterChanged: () => { this._updateDraggable() }
      }
    })

    // Search related
    this._hashes = null
    this._currentSearch = null
    this._currentSearchIndex = 0
    this._results = [] // Saves all search results
    this._maxWeight = -1 // Maximum weight found during search
    this._showSearchResults = false // Indicates whether or not _gen() should include negative search results.

    // Activate event listeners
    this._act()
  }

  /**
    * Refreshes the list with new data
    * @param  {Object} data A ZettlrDir tree object
    * @return {ListView}      Chainability.
    */
  refresh (data = this._renderer.getCurrentDir()) {
    this._data = data || []
    // Potentially re-select the current file
    if (this._renderer.getCurrentFile()) {
      this._selectedFile = this._renderer.getCurrentFile().hash
    } else {
      this._selectedFile = null
    }

    this._gen() // Generate all tags
    this._list.update(this._tags)
    // Afterwards, update the draggables
    this._updateDraggable()

    // If there is no file selected we are done
    if (!this._selectedFile) return this

    // Else: Scroll the currently selected file into view
    let i = this._data.find((elem) => { return (elem.hash === this._selectedFile) })
    if (i) {
      i = this._data.indexOf(i)
      this._scrollIntoView(i)
    }

    return this
  }

  /**
   * Generates the HTML code as strings that will be used by Clusterize.js to display elements.
   * @return {void}            No return.
   */
  _gen () {
    // Check whether the data-array is already an array. Else, flatten the
    // object tree to a one-dimensional array.
    if (!Array.isArray(this._data)) {
      this._data = flattenDirectoryTree(this._data)
    }

    // Reset the tags.
    this._tags = []

    let keywords = []
    for (let kw of this._keywords) {
      keywords.push(kw.name) // For quicker access during huge list builds
    }

    // Indicator whether or not we're currently in a virtual directory
    let inVirtualDir = false
    let vdhash

    // Traverse the flattened data-array and replace each corresponding
    // index in this._tags with an HTML representation of the object.
    for (let i = 0; i < this._data.length; i++) {
      let d = this._data[i]
      if (this._showSearchResults && !this._results.find((elem) => { return (elem.hash === d.hash) }) && d.type === 'file') {
        // Don't include no-result-rows in the next list.
        continue
      }

      // If the user wishes to not show directories (both real and virtual ones),
      // continue and step over this row.
      if (this._showSearchResults && this._hideDirs && d.type !== 'file') continue

      // Only change the indicator with different directory types
      if (d.type === 'virtual-directory') {
        inVirtualDir = true
        vdhash = d.hash
      } else if (d.type === 'directory') {
        inVirtualDir = false
        vdhash = undefined
      }

      // Calculate search result bg color, in the style of a heat map.
      let bgcolor = ''
      let color = ''
      if (this._showSearchResults && d.type === 'file') {
        let res = this._results.find((elem) => { return (elem.hash === d.hash) })
        let w = 0
        for (let r of res.result) {
          w += r.weight
        }
        w = Math.round(w / this._maxWeight * 100) // Percentage
        bgcolor = ` style="background-color:hsl(159, ${w}%, 50%);"` // hue of 159 corresponds to @green-0
        color = ` style="color: ${(w > 50) ? 'black' : 'white'};"`
      }

      let sort = (d.type === 'directory' || d.type === 'virtual-directory') ? `data-sorting="${d.sorting}" ` : ''
      let selected = (this._selectedFile && this._selectedFile === d.hash) ? ` selected` : ''
      let id = (d.id) ? `data-id=${d.id}` : ''
      let snippets = (this._snippets) ? ' snippets' : ''
      let vdclass = (inVirtualDir) ? ' vd-file' : '' // File is not actually present in this "dir"
      let vdhashAttr = (inVirtualDir && vdhash) ? ' data-vd-hash="' + vdhash + '"' : '' // For context menu actions we need to pass vd-hash, b/c accessing parent will not work.
      let elem = `<li class="${d.type}${selected}${snippets}${vdclass}" ${id} data-hash="${d.hash}" ${sort}${bgcolor}${vdhashAttr}>`
      if (d.type === 'directory' || d.type === 'virtual-directory') {
        // Render a directory
        elem += d.name
        if (this._snippets) {
          elem += `<p class="snippet">
          <span class="directories">
            ${d.children.filter(e => e.type === 'directory').length} ${trans('gui.dirs')}
          </span>
          <span class="files">
            ${d.children.filter(e => e.type === 'file').length} ${trans('gui.files')}
          </span>
          <span class="virtual-directories">
            ${d.children.filter(e => e.type === 'virtual-directory').length} ${trans('gui.virtual_dirs')}
          </span>
          </p>`
        }
      } else if (d.type === 'file') {
        // Retrieve all tags the file got.
        // Seriously, I _need_ to refactor all this messy monkey-patched code some day.
        let tl = `<div class="taglist">`
        for (let t of d.tags) {
          if (keywords.includes(t)) {
            let thekey = this._keywords.find((elem) => { return (elem.name === t) })
            tl += `<div class="tagspacer"><div class="tag" style="background-color:${thekey.color};" data-tippy-content="${thekey.desc}" data-tag="${thekey.name}"></div></div>`
          }
        }
        tl += `</div>`

        elem += `<p class="filename"${color}>${d.name.substr(0, d.name.lastIndexOf('.'))}</p>${tl}`

        if (this._snippets) {
          let extindicator = (d.ext === '.tex') ? '<span class="tex-indicator">TeX</span>' : ''
          elem += `<p class="snippet">${extindicator}
          <span class="date">${formatDate(new Date(d.modtime))}</span>`
          if (d.id) elem += ` <span class="id">${d.id}</span>`
          if (d.tags.length > 0) elem += ` <span class="tags" data-tippy-content="${d.tags.join(',\n')}">#${d.tags.length}</span>`

          // Finally, set a target progress indicator, if there is a target.
          if (d.target) {
            let count = (d.target.mode === 'words') ? d.wordCount : d.charCount
            let progress = count / d.target.count
            let large = (progress > 0.5) ? 1 : 0
            if (progress > 1) progress = 1 // Never exceed 100 %
            let x = Math.cos(2 * Math.PI * progress)
            let y = Math.sin(2 * Math.PI * progress)
            elem += `<svg class="target-progress-indicator"
            width="16" height="16" viewBox="-1 -1 2 2"
            data-tippy-content="${localiseNumber(count)} / ${localiseNumber(d.target.count)} (${Math.round(progress * 100)} %)">
            <circle class="indicator-meter" cx="0" cy="0" r="1" shape-rendering="geometricPrecision"></circle>
            <path d="M 1 0 A 1 1 0 ${large} 1 ${x} ${y} L 0 0" fill="" class="indicator-value" shape-rendering="geometricPrecision"></path>
            </svg>`
          }
          elem += `</p>`
        }
      }
      elem += '</li>' // Close the tag

      // First, this will create the index, thereby enlargening the array.
      // And each subsequent time, it will simply replace the elements.
      //
      // ^-- Hendrik, were you drunk writing this? Where is anything replaced here?
      // There will be NOTHING replaced here. You hear me? NOTHING. This whole
      // array will be recreated EVERY TIME. Live with it. Your life is a failure.
      this._tags.push(elem)
    }
  }

  /**
    * Updates the draggables. Is called everytime a new cluster is rendered.
    * It also updates the tippy-tooltips on the tags.
    * @return {void} No return.
    */
  _updateDraggable () {
    this._listContainer.find('li.file').draggable({
      'cursorAt': { 'top': 10, 'left': 10 },
      'scroll': false,
      'helper': function () {
        // Return a dragger element containing the filename
        let helper = $('<div>').addClass('dragger')
        helper.text($(this).children('p').first().text())
        helper.appendTo('body')
        return helper
      },
      'revert': 'invalid', // Only revert if target was invalid
      'revertDuration': 200,
      'distance': 5,
      // Tell jQuery to update the draggable & droppable positions on each
      // mousemove. This is necessary for the compact view as the two containers
      // will swap shortly after drag begins, so the positions of the droppables
      // are rather different from their positions before the start.
      refreshPositions: true,
      // We have to lock/unlock directories on dragging, so that not
      // suddenly the preview list reappears and dropping becomes impossible
      'start': (e, ui) => { this._renderer.lockDirectories() },
      'stop': (e, ui) => {
        this._renderer.unlockDirectories()
        // Somehow the jQuery UI thinks it's funny to set this attribute and not remove it after dragstop.
        $('body').css('cursor', '')
      },
      'drag': (e, ui) => {
        if (e.clientX <= 0 || e.clientX >= $(window).innerWidth() ||
        e.clientY <= 0 || e.clientY >= $(window).innerHeight()) {
          let elem = $(e.target)
          while (!elem.is('li')) {
            elem = elem.parent()
          }
          global.ipc.send('file-drag-start', { 'hash': elem.attr('data-hash') })
          // Remove the highlight class over directories.
          $('#directories ul li').removeClass('highlight')
          return false // Return false to cancel the current drag operation
        }
      }
    })

    // Also, always re-tippify the tags on the files on each cluster change
    tippy('#preview .taglist .tag', {
      delay: 100,
      arrow: true,
      duration: 100,
      flip: true
    })

    // Also tippify the tag list of each file as well as a potential progress meter.
    tippy('#preview .snippet .tags, #preview .snippet .target-progress-indicator', {
      delay: 100,
      arrow: true,
      duration: 100,
      flip: false,
      flipBehavior: [ 'right' ]
    })
  }

  /**
    * Empties the list.
    * @return {ZettlrPreview} Chainability.
    */
  _empty () {
    // Simply refresh with an empty array.
    return this.refresh([])
  }

  /**
    * Activates the event listeners on the preview pane.
    * @return {void} No return.
    */
  _act () {
    // First of all, focus the listcontainer to enable keyboard navigation
    this._listContainer.focus()

    // Activate directories and files respectively.
    this._listContainer.on('click', 'li', (e) => {
      // focus the listContainer again! (in case it has lost focus to the editor)
      this._listContainer.focus()

      let elem = $(e.target)
      while (!elem.is('li') && !elem.is('body')) {
        // Click may have occurred on a span or strong
        elem = elem.parent()
      }

      if (e.altKey || e.ctrlKey) {
        // Request a quicklook for that thing. Or to enter that dir.
        if (elem.hasClass('directory')) {
          let par = this._renderer.findObject(parseInt(elem.attr('data-hash')))
          if (par.hasOwnProperty('path')) {
          // As the "parent" property is cut out during the preparation
          // for the sending of the whole directory tree, we have
          // to improvise: Generate the hash from the dirname of
          // our directory.
            let parentHash = hash(require('path').dirname(par.path))
            this._renderer.requestDir(parentHash)
          }
        } else if (elem.hasClass('file')) {
          this._renderer.handleEvent('quicklook', { 'hash': elem.attr('data-hash') })
        }
        return
      }

      if (elem.hasClass('directory')) {
        this._renderer.requestDir(elem.attr('data-hash'))
        return
      }

      if (elem.hasClass('selected')) {
        // Don't re-select an already selected file.
        return
      }

      // Request the clicked file
      global.ipc.send('file-get', elem.attr('data-hash'))
    })

    this._listContainer.on('mouseenter', 'li.directory', (e) => {
      if (this._listContainer.find('.sorter').length > 0) {
        // There is already a sorter in the div.
        return
      }
      let sort = $(e.target).attr('data-sorting')
      let sortNameIcon, sortTimeIcon

      if (sort === 'name-up') {
        sortNameIcon = SORT_NAME_UP
        sortTimeIcon = SORT_TIME_DOWN
      } else if (sort === 'name-down') {
        sortNameIcon = SORT_NAME_DOWN
        sortTimeIcon = SORT_TIME_DOWN
      } else if (sort === 'time-up') {
        sortTimeIcon = SORT_TIME_UP
        sortNameIcon = SORT_NAME_DOWN
      } else if (sort === 'time-down') {
        sortTimeIcon = SORT_TIME_DOWN
        sortNameIcon = SORT_NAME_DOWN
      } else {
        sortTimeIcon = SORT_TIME_UP
        sortNameIcon = SORT_NAME_UP
      }

      let sortingHeader = $(`<div class="sorter"><span class="sortName">${sortNameIcon}</span><span class="sortTime">${sortTimeIcon}</span></div>`)
      sortingHeader.click((e) => {
        let elem = $(e.target)
        if (elem.hasClass('sortName') || elem.hasClass('sortTime')) {
          e.preventDefault()
          e.stopPropagation() // Don't "click through" and select the directory.
        }

        // We need the hex charcode as HTML entity. jQuery is not as
        // nice as to give it back to us itself.
        let sort = '&#x' + elem.text().charCodeAt(0).toString(16) + ';'
        let hash = elem.parent().parent().attr('data-hash')
        if (sort === SORT_NAME_UP) {
          global.ipc.send('dir-sort', { 'hash': hash, 'type': 'name-down' })
        } else if (sort === SORT_TIME_UP) {
          global.ipc.send('dir-sort', { 'hash': hash, 'type': 'time-down' })
        } else if (sort === SORT_NAME_DOWN) {
          global.ipc.send('dir-sort', { 'hash': hash, 'type': 'name-up' })
        } else if (sort === SORT_TIME_DOWN) {
          global.ipc.send('dir-sort', { 'hash': hash, 'type': 'time-up' })
        }
      })
      $(e.target).append(sortingHeader)
    })

    this._listContainer.on('mouseleave', 'li.directory', (e) => {
      this._listContainer.find('.sorter').detach()
    })

    this._listContainer.on('click', '.taglist .tag', (e) => {
      // Initiate tag searches when the user clicks a tag.
      this._renderer.triggerGlobalSearch('#' + $(e.target).attr('data-tag'))
      // Also hide the tooltip if it is still shown
      if (e.target.hasOwnProperty('_tippy')) e.target._tippy.hide().destroy()
      e.stopPropagation() // Prevent the file itself from being clicked
    })

    // Enable arrow key navigation
    this._listContainer.on('keydown', (e) => {
      if (e.which === 38 || e.which === 40) {
        // First determine the index of the currently selected element.
        let index = this._data.findIndex((elem) => { return elem.hash === this._selectedFile })

        let direction = (e.which === 40) ? 1 : -1
        let toEnd = ((process.platform === 'darwin' && e.metaKey) || (process.platform !== 'darwin' && e.ctrlKey))
        // In case the user wants to go to the end of the list, reset the index
        // and reverse the search direction
        if (toEnd) {
          if (direction === 1) {
            index = this._data.length // Index must be 1 higher because it WILL be reduced
            direction = -1
          } else {
            index = -1 // Index must be 1 lower because it WILL be increased
            direction = 1
          }
        }

        do {
          index += direction
        } while (this._data[index] && this._data[index].type !== 'file')
        // Finally request the file
        if (this._data[index]) {
          // Request this file
          global.ipc.send('file-get', this._data[index].hash)
        }
      }
    })

    // Show the arrow button once the mouse pointer gets high enough
    this._div.on('mousemove', (e) => {
      if ($('#combiner').hasClass('expanded')) {
        return // No need for the arrow in expanded mode
      }
      if (e.clientY < ($('#toolbar').height() + 80)) {
        $('#arrow-button').removeClass('hidden')
      } else {
        $('#arrow-button').addClass('hidden')
      }
    })

    // Have it stay visible b/c hovering over the button will "leave" the
    // div itself
    $('#arrow-button').on('mousemove', (e) => {
      $('#arrow-button').removeClass('hidden')
    })

    this._div.on('mouseleave', (e) => {
      $('#arrow-button').addClass('hidden')
    })

    // Switch over to the directories once clicked
    $('#arrow-button').click((e) => {
      this._renderer.showDirectories()
      $('#arrow-button').addClass('hidden')
    })

    return this
  }

  /**
    * Selects a specific hash
    * @param  {Number} hash The hash describing the file
    */
  select (hash) {
    if (typeof hash !== 'number') hash = parseInt(hash)
    if (!hash) return

    this._selectedFile = hash
    // First deselect all
    this._listContainer.find('li.file').removeClass('selected')
    // Then determine whether or not the new element is already rendered
    let elem = this._listContainer.find('li[data-hash="' + hash + '"]')
    if (elem.length > 0) {
      elem.addClass('selected')
    } else {
      // We need a manual refresh because the element currently is not rendered
      elem = this._data.find((el) => { return (el.hash === hash) })
      if (elem) {
        // Only regenerate everything if the element is in the current dir
        this._gen()
        // And push it into clusterize
        this._list.update(this._tags)
      }
    }
    // Now scroll it into view if not already
    let i = this._data.find((elem) => { return (elem.hash === hash) })
    if (i) {
      i = this._data.indexOf(i)
      this._scrollIntoView(i)
    }
  }

  /**
    * Is the preview pane currently hidden?
    * @return {Boolean} True or false, depending on the class.
    */
  isHidden () { return this._div.hasClass('hidden') }

  /**
    * Show the preview pane (by removing the hidden class)
    */
  show () { this._div.removeClass('hidden') }

  /**
    * Hide the preview pane (by adding the hidden class)
    */
  hide () { this._div.addClass('hidden') }

  /**
   * Set the snippets to true or false depending on val.
   * @param  {Boolean} val Either true or false.
   * @return {ZettlrPreview}     This for chainability.
   */
  snippets (val) {
    this._snippets = Boolean(val)
    this.refresh()
    return this
  }

  /**
   * Indicates whether or not the directories should be displayed during a
   * global search.
   * @param  {Boolean} val Whether or not to hide directories.
   * @return {ZettlrPreview}     This for chainability.
   */
  hideDirs (val) {
    this._hideDirs = Boolean(val)
    this.refresh()
    return this
  }

  /**
    * The user has requested a search. This function prepares the terms and commences the search.
    * @param  {String} term The value of the search field.
    * @return {void}      Nothing to return.
    */
  beginSearch (term) {
    // First sanitize the terms
    let myTerms = []
    let curWord = ''
    let hasExact = false
    let operator = 'AND'

    for (let i = 0; i < term.length; i++) {
      let c = term.charAt(i)
      if ((c === ' ') && !hasExact) {
        // Eat word and next
        if (curWord.trim() !== '') {
          myTerms.push({ 'word': curWord.trim(), 'operator': operator })
          curWord = ''
          if (operator === 'OR') {
            operator = 'AND'
          }
        }
        continue
      } else if (c === '|') {
        // We got an OR operator
        // So change the last word's operator and set current operator to OR
        operator = 'OR'
        // Take a look forward and if the next char is also a space, eat it right now
        if (term.charAt(i + 1) === ' ') {
          ++i
        }
        // Also the previous operator should also be set to or
        myTerms[myTerms.length - 1].operator = 'OR'
        continue
      } else if (c === '"') {
        if (!hasExact) {
          hasExact = true
          continue
        } else {
          hasExact = false
          myTerms.push({ 'word': curWord.trim(), 'operator': operator })
          curWord = ''
          if (operator === 'OR') {
            operator = 'AND'
          }
          continue
        }
        // Don't eat the quote;
      }

      curWord += term.charAt(i)
    }

    // Afterwards eat the last word if its not empty
    if (curWord.trim() !== '') {
      myTerms.push({ 'word': curWord.trim(), 'operator': operator })
    }

    // Now pack together all consecutive ORs to make it easier for the search
    // in the main process
    let currentOr = {}
    currentOr.operator = 'OR'
    currentOr.word = []
    let newTerms = []

    for (let i = 0; i < myTerms.length; i++) {
      if (myTerms[i].operator === 'AND') {
        if (currentOr.word.length > 0) {
          // Duplicate object so that the words are retained
          newTerms.push(JSON.parse(JSON.stringify(currentOr)))
          currentOr.word = []
        }
        newTerms.push(myTerms[i])
      } else if (myTerms[i].operator === 'OR') {
        currentOr.word.push(myTerms[i].word)
      }
    }

    // Now push the currentOr if not empty
    if (currentOr.word.length > 0) {
      newTerms.push(JSON.parse(JSON.stringify(currentOr)))
    }

    // Now we are all set and can begin the journey. First we need to prepare
    // some things. First: Write the current terms into this object
    // second, listen for search events and third clear everything up when
    // we are done.

    this._hashes = []
    for (let d of this._data) {
      if (d.type === 'file') {
        this._hashes.push(d.hash)
      }
    }
    this._currentSearch = newTerms

    // The search index will be increased BEFORE accessing the first file!
    this._currentSearchIndex = -1

    // Also, to prevent previous search results from showing up, remove them
    this._results = []
    this._maxWeight = -1

    // Aaaaand: Go!
    this._doSearch()
  }

  /**
    * Do one single search cycle.
    * @return {void} Nothing to return.
    */
  _doSearch () {
    if (this._hashes.length === 0) {
      this.endSearch()
      return
    }

    // We got an array to search through.
    if (this._currentSearchIndex === (this._hashes.length - 1)) {
      // End search
      this._renderer.endSearch()
      return
    }
    if (this._currentSearchIndex > this._hashes.length) {
      this._renderer.endSearch()
      return
    }

    this._currentSearchIndex++

    this._renderer.searchProgress(this._currentSearchIndex, this._hashes.length)

    // Send a request to the main process and handle it afterwards.
    global.ipc.send('file-search', {
      'hash': this._hashes[this._currentSearchIndex],
      'terms': this._currentSearch
    })
  }

  /**
    * Handle the result of the search from main process.
    * @param  {Object} res Contains the search result and the hash.
    * @return {void}     Nothing to return.
    */
  handleSearchResult (res) {
    if (res.result.length > 0) {
      this._results.push(res) // For later reference
      let w = 0
      for (let r of res.result) {
        w += r.weight
      }
      if (w > this._maxWeight) {
        this._maxWeight = w
      }
    }

    // Next search cycle
    this._doSearch()
  }

  /**
    * Ends a search if there are no more hashes to search through.
    * @return {void} Nothing to return.
    */
  endSearch () {
    this._currentSearchIndex = 0
    this._hashes = []
    this._currentSearch = null
    this._showSearchResults = true // Indicate that the list should be only displaying search results.
    this.refresh() // Refresh to apply.
    // Also mark the results in the potential open file
    this._renderer.getEditor().markResults()
  }

  /**
    * Removes all search indicators and shows all contents.
    */
  showFiles () {
    this._showSearchResults = false
    this._results = []
    this._maxWeight = -1
    this.refresh() // Refresh to re-show.
  }

  /**
    * Returns a search result or null.
    * @param  {Number}  hash The hash to be searched for.
    * @return {Object} Either the search result or null.
    */
  hasResult (hash) {
    if (typeof hash !== 'number') hash = parseInt(hash)
    return this._results.find((elem) => { return (elem.hash === hash) })
  }

  // END SEARCH

  /**
    * Scrolls the element given by index into view.
    * @param  {Number} index The index (as referring to the generated tags).
    * @return {Boolean} True if the call succeeded, false if not.
    */
  _scrollIntoView (index) {
    let listHeight = $('#preview ul#filelist').height()
    let frameSize = this._div.innerHeight()
    let elemHeight = listHeight / this._tags.length
    let containerTop = this._div.scrollTop()
    let containerBottom = containerTop + frameSize
    let elemTop = index * elemHeight
    let elemBottom = elemTop + elemHeight
    // The number 20 is completely arbitrary, because I do not know why it's all
    // so much off. Clusterize seems to produce a clusterf***.
    if (elemTop < containerTop + 20) {
      this._div.scrollTop(elemTop - 20)
    } else if (elemBottom > containerBottom) {
      this._div.scrollTop(elemTop - frameSize + elemHeight)
    }
  }

  /**
    * Update the files displayed.
    * @param  {Object} files A directory tree.
    * @return {ZettlrPreview}       Chainability.
    * @deprecated Will be removed in a further version.
    */
  update (files) {
    return this.refresh(files)
  }

  /**
    * Sets the tags. But not the _tags, the _keywords
    * @param {Array} newtags The new tags
    */
  setTags (newtags) {
    this._keywords = newtags
  }
}

module.exports = ZettlrPreview
