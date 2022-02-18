/**
* @ignore
* BEGIN HEADER
*
* Contains:        TableEditor class
* CVM-Role:        View
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This class is a powerful helper class able to work with
*                  Markdown tables. It is able to modify them using a real
*                  contenteditable table that can be converted to Markdown
*                  on the fly and also be created from Markdown.
*
* END HEADER
*/

import buildPipeTable from './build-pipe'
import buildSimpleTable from './build-simple'
import buildGridTable from './build-grid'

import { getConverter } from '@common/util/md-to-html'

import computeCSS from './compute-css'
import { ColAlignment, TableEditorOptions } from './types'

// Look what I found: https://www.w3schools.com/jsref/dom_obj_table.asp

export default class TableEditor {
  /**
   * Holds the current number of rows within the table
   *
   * @var {number}
   */
  private _rows: number
  /**
   * Holds the current number of columns within the table
   *
   * @var {number}
   */
  private _cols: number
  /**
   * Holds the current column-index
   *
   * @var {number}
   */
  private _cellIndex: number
  /**
   * Holds the current row-index
   *
   * @var {number}
   */
  private _rowIndex: number
  /**
   * The options passed to the instance
   *
   * @var {TableEditorOptions}
   */
  private readonly _options: TableEditorOptions
  /**
   * Holds the type of the table returned by the editor
   *
   * @var {'pipe'|'simple'|'grid'}
   */
  private readonly _mdTableType: 'pipe'|'simple'|'grid'
  /**
   * If true, any events on the table editor are not handled
   *
   * @var {boolean}
   */
  private _eventLock: boolean
  /**
   * The container element for the editor
   *
   * @var {HTMLElement}
   */
  private readonly _containerElement: HTMLElement
  /**
   * The DOM element representing the editor
   *
   * @var {HTMLTableElement}
   */
  private readonly _elem: HTMLTableElement
  /**
   * The actual table contents
   *
   * @var {string[][]}
   */
  private readonly _ast: string[][]
  /**
   * Holds the current alignment per each column
   *
   * @var {ColAlignment[]}
   */
  private _colAlignment: ColAlignment[]
  /**
   * Holds the size of the edge buttons
   *
   * @var {number}
   */
  private readonly _edgeButtonSize: number
  /**
   * The following variables are the various buttons
   */
  private readonly _alignButtons: HTMLDivElement
  private readonly _alignLeftButton: HTMLDivElement
  private readonly _alignCenterButton: HTMLDivElement
  private readonly _alignRightButton: HTMLDivElement

  private readonly _removeButtons: HTMLDivElement
  private readonly _removeRowButton: HTMLDivElement
  private readonly _removeColButton: HTMLDivElement

  private readonly _addTopButton: HTMLDivElement
  private readonly _addBottomButton: HTMLDivElement
  private readonly _addLeftButton: HTMLDivElement
  private readonly _addRightButton: HTMLDivElement

  private readonly _md2html: ReturnType<typeof getConverter>

  /**
   * Creates a new TableHelper.
   *
   * @param {string[][]}         ast          The table AST
   * @param {ColAlignment[]}     alignments   The column alignments
   * @param {string}             tableType    The table type (can be pipe, simple, or grid)
   * @param {TableEditorOptions} [options={}] An object with optional callbacks for onBlur and onChange.
   */
  constructor (ast: string[][], alignments: ColAlignment[], tableType: 'pipe'|'simple'|'grid', options: TableEditorOptions = {}) {
    // First, copy over simple properties
    this._rows = ast.length
    this._cols = ast[0].length
    this._cellIndex = 0
    this._rowIndex = 0
    this._options = options
    this._mdTableType = tableType
    this._eventLock = false // See _rebuildDOMElement for details
    this._ast = ast
    this._colAlignment = alignments
    this._edgeButtonSize = 30 // Size in pixels

    this._md2html = getConverter(window.getCitation)

    // Find the container element
    if ('container' in options && options.container instanceof HTMLElement) {
      this._containerElement = options.container
    } else if ('container' in options && typeof options.container === 'string') {
      const target = document.querySelector(options.container)
      if (target === null) {
        throw new Error(`Could not find element using selector ${options.container}`)
      }
      this._containerElement = target as HTMLElement
    } else {
      this._containerElement = document.body
    }

    // CREATE THE TABLE BUTTONS
    const alignButtonsTpl = document.createElement('div')
    alignButtonsTpl.classList.add('table-helper-align-button')

    const removeLine = document.createElement('div')
    removeLine.classList.add('table-helper-remove-button-line')

    const removeButtonsTpl = document.createElement('div')
    removeButtonsTpl.classList.add('table-helper-remove-button')
    removeButtonsTpl.appendChild(removeLine.cloneNode(true))
    removeButtonsTpl.appendChild(removeLine.cloneNode(true))
    removeButtonsTpl.appendChild(removeLine.cloneNode(true))

    const template = document.createElement('div')
    template.classList.add('table-helper-add-button')
    template.innerHTML = '+'

    this._alignButtons = document.createElement('div')
    this._alignButtons.classList.add('table-helper-align-button-container')

    const alignLine = document.createElement('div')
    alignLine.classList.add('table-helper-align-button-line')
    alignButtonsTpl.appendChild(alignLine.cloneNode())
    alignButtonsTpl.appendChild(alignLine.cloneNode())
    alignButtonsTpl.appendChild(alignLine.cloneNode())

    this._alignLeftButton = alignButtonsTpl.cloneNode(true) as HTMLDivElement
    this._alignLeftButton.classList.add('align-left')
    this._alignCenterButton = alignButtonsTpl.cloneNode(true) as HTMLDivElement
    this._alignCenterButton.classList.add('align-center')
    this._alignRightButton = alignButtonsTpl.cloneNode(true) as HTMLDivElement
    this._alignRightButton.classList.add('align-right')
    this._alignButtons.appendChild(this._alignLeftButton)
    this._alignButtons.appendChild(this._alignCenterButton)
    this._alignButtons.appendChild(this._alignRightButton)

    this._removeButtons = document.createElement('div')
    this._removeButtons.classList.add('table-helper-remove-button-container')
    this._removeRowButton = removeButtonsTpl.cloneNode(true) as HTMLDivElement
    this._removeRowButton.classList.add('row')
    this._removeColButton = removeButtonsTpl.cloneNode(true) as HTMLDivElement
    this._removeColButton.classList.add('col')
    this._removeButtons.appendChild(this._removeRowButton)
    this._removeButtons.appendChild(this._removeColButton)

    this._addTopButton = template.cloneNode(true) as HTMLDivElement
    this._addBottomButton = template.cloneNode(true) as HTMLDivElement
    this._addLeftButton = template.cloneNode(true) as HTMLDivElement
    this._addRightButton = template.cloneNode(true) as HTMLDivElement
    // END Create buttons

    // Create the Table element
    const table = document.createElement('table')
    table.addEventListener('keydown', this._onKeyDown.bind(this))
    table.addEventListener('keyup', this._onKeyUp.bind(this))
    table.classList.add('table-helper')
    this._elem = table

    // Populate the inner contents initially
    this._rebuildDOMElement()

    this._containerElement.addEventListener('mousemove', this._moveHelper.bind(this))
    this._containerElement.addEventListener('scroll', (event) => {
      if (this._edgeButtonsVisible) {
        this._recalculateEdgeButtonPositions()
      }
    })

    // Activate the edge button's functionality. We need to prevent the default
    // on the mousedowns, otherwise the table cell will lose focus, thereby
    // triggering the blur event on the table.
    this._addTopButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.prependRow()
    })
    this._addBottomButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.appendRow()
    })
    this._addLeftButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.prependCol()
    })
    this._addRightButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.appendCol()
    })
    this._alignLeftButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.changeColAlignment('left')
    })
    this._alignCenterButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.changeColAlignment('center')
    })
    this._alignRightButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.changeColAlignment('right')
    })
    this._removeRowButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.pluckRow()
    })
    this._removeColButton.addEventListener('mousedown', (e) => {
      e.preventDefault()
      this.pluckCol()
    })

    // Inject the CSS necessary to style the table and buttons.
    this._injectCSS()
  } // END CONSTRUCTOR

  /**
   * Shows or hides the table buttons depending on the mouse position
   *
   * @param   {MouseEvent}  evt  The event
   */
  _moveHelper (evt: MouseEvent): void {
    const rect = this._elem.getBoundingClientRect()
    const minX = rect.left - this._edgeButtonSize / 2
    const minY = rect.top - this._edgeButtonSize / 2
    const maxX = minX + rect.width + this._edgeButtonSize // Not half to account for the lower minY
    const maxY = minY + rect.height + this._edgeButtonSize // Not half to account for the lower minY

    if (
      evt.clientX >= minX &&
      evt.clientX <= maxX &&
      evt.clientY >= minY &&
      evt.clientY <= maxY
    ) {
      this._showEdgeButtons()
      // Always recalculate the positions to make sure
      // their position is always updated asap.
      this._recalculateEdgeButtonPositions()
    } else {
      this._hideEdgeButtons()
    }
  }

  /**
   * Rebuilds the inner contents of the Table element
   */
  _rebuildDOMElement (): void {
    this._eventLock = true
    // Removing any innerHTML will trigger events on the cells, namely
    // blur events. If we change the table (adding/removing cols/rows)
    // we are rebuilding the internal DOM. However, having blur trigger
    // during this would modify the internal AST, which we do not want.
    this._elem.innerHTML = '' // Reset
    this._eventLock = false

    const tbody = this._elem.createTBody()

    for (let i = 0; i < this._ast.length; i++) {
      const row = tbody.insertRow(-1)
      row.style.width = '100%'

      for (let j = 0; j < this._ast[i].length; j++) {
        const cell = row.insertCell(-1)
        cell.innerHTML = this._md2html(this._ast[i][j])
        cell.style.textAlign = this._colAlignment[j]
        cell.setAttribute('contenteditable', 'true')
        cell.addEventListener('focus', (event) => {
          this._onCellFocus(cell)
        })
        cell.addEventListener('blur', (event) => {
          this._onCellBlur(cell)
        })
      }
    }

    this.selectCell()
  }

  /**
   * Handles blur events on cells
   *
   * @param   {DOMElement}  cell  The cell on which the event was triggered
   */
  _onCellBlur (cell: HTMLTableCellElement): void {
    if (this._eventLock) {
      return // Ignore events
    }

    const col = cell.cellIndex
    const row = (cell.parentElement as HTMLTableRowElement).rowIndex

    // Re-render the table element and save the textContent as data-source
    this._ast[row][col] = cell.textContent ?? ''
    cell.innerHTML = this._md2html(this._ast[row][col])

    // For a short amount of time, the table won't have any focused
    // elements, so we'll set a small timeout, after which we test
    // if any element inside the table has in the meantime received
    // focus.
    setTimeout(() => {
      if (this._elem.querySelectorAll(':focus').length === 0) {
        // If we are here, the full table has lost focus.
        // It's a good idea to update any content now!
        if (this._options.onBlur !== undefined) {
          this._options.onBlur(this)
        }
      }
    }, 10)
  }

  /**
   * Handles a focus event on table cells
   *
   * @param   {DOMElement}  cell  The cell on which the event has triggered
   */
  _onCellFocus (cell: HTMLTableCellElement): void {
    if (this._eventLock) {
      return // Ignore events
    }

    // As soon as any cell is focused, recalculate
    // the current cell and table dimensions.
    const col = cell.cellIndex
    const row = (cell.parentElement as HTMLTableRowElement).rowIndex
    // Before the cell is focused, replace the contents with the source for
    // easy editing, thereby removing any pre-rendered HTML
    cell.innerHTML = this._ast[row][col]

    this._rowIndex = row
    this._cellIndex = col

    this._recalculateEdgeButtonPositions()
  }

  /**
   * Key up event
   *
   * @param   {KeyboardEvent}  event  The keyboard event
   */
  _onKeyUp (event: KeyboardEvent): void {
    // Update the AST after the cells contents have been updated correctly.
    // This way we prevent glitches if someone edits a cell's contents and
    // immediately adds rows or columns.
    const val = this._elem.rows[this._rowIndex].cells[this._cellIndex].textContent
    this._ast[this._rowIndex][this._cellIndex] = val ?? ''
    // After everything is done, and potentially new rows, cols and content has been
    // added, we need to notify some third actor that the table has been changed.
    // Why do this on a separate, keyup event? To include the last pressed character.
    // Navigation must be handled on keydown, NOT on keyup, but the last "normal" char
    // inserted in the table will only be recognised on keyUp.
    this._signalContentChange()
  }

  /**
   * Keydown event
   *
   * @param   {KeyboardEvent}  evt  The keyboard event
   */
  _onKeyDown (event: KeyboardEvent): void {
    // Also recalculate the button positions as the table's size may have changed.
    this._recalculateEdgeButtonPositions()

    if (event.target === null) {
      return
    }

    const target = event.target as HTMLElement

    const isArrow = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight'
    ].includes(event.key)

    if (isArrow) {
      let cursorPosition = this._getCursorPositionInElement(target)
      let isAtEnd = cursorPosition === target.textContent?.length
      let isAtBegin = cursorPosition === 0

      switch (event.key) {
        case 'ArrowLeft': // Arrow Left
          // Move to previous cell if isAtBegin
          if (isAtBegin) this.previousCell()
          break
        case 'ArrowUp': // Arrow Up
          // Move to previous row
          this.previousRow()
          break
        case 'ArrowRight': // Arrow Right
          // Move to next cell if isAtEnd (without adding new rows)
          if (isAtEnd) this.nextCell(false)
          break
        case 'ArrowDown': // Arrow Down
          // Move to next row (without adding new rows)
          this.nextRow(false)
          break
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this.nextRow()
      // In this case, also select the full text content
      // this._selectElementContents(evt.target)
    } else if (event.key === 'Tab') {
      event.preventDefault()
      // Move to next column, or to previous if shift was pressed.
      if (event.shiftKey) {
        this.previousCell()
      } else {
        this.nextCell()
      }
    }
  }

  /**
  * Recalculates the correct positions of all edge buttons.
  */
  _recalculateEdgeButtonPositions (): void {
    if (!this._edgeButtonsVisible) {
      return
    }

    // First we need the measurements of both the current cell and the container element.
    let currentCell = this._elem.rows[this._rowIndex].cells[this._cellIndex]

    // We need a lot of bounding boxes, actually
    const cellRect = currentCell.getBoundingClientRect()
    const containerRect = this._containerElement.getBoundingClientRect()
    const tableRect = this._elem.getBoundingClientRect()

    let cellTop = cellRect.top
    let cellLeft = cellRect.left
    let cellWidth = cellRect.width
    let cellHeight = cellRect.height
    let cellRight = cellLeft + cellWidth
    let cellBottom = cellTop + cellHeight
    let containerTop = containerRect.top
    let containerHeight = containerRect.height
    let containerBottom = containerTop + containerHeight

    // Determine whether or not the active cell is visible on screen
    let cellIsOnScreen = cellTop > containerTop && cellBottom < containerBottom
    // Then calculate the button positions. First for the align- and remove-buttons
    // as these will always be visible and then for the add-buttons depending on
    // cell visibility.
    this._alignButtons.style.top = `${tableRect.top - this._edgeButtonSize / 2}px`
    this._alignButtons.style.left = `${tableRect.left + this._edgeButtonSize / 2}px`
    this._removeButtons.style.top = `${tableRect.top - this._edgeButtonSize / 2}px`
    this._removeButtons.style.left = `${tableRect.left + tableRect.width - this._edgeButtonSize * 2.5}px`

    // After changing the bounding rects, we can get them now
    const alignButtonsRect = this._alignButtons.getBoundingClientRect()
    const removeButtonsRect = this._removeButtons.getBoundingClientRect()

    // Also make sure the button groups stay visible
    // if the user scrolls to one of the edges of the
    // container element
    if (alignButtonsRect.top < containerTop) {
      this._alignButtons.style.top = `${containerTop}px`
    }
    if (alignButtonsRect.top + this._edgeButtonSize > containerBottom) {
      this._alignButtons.style.top = `${containerBottom - this._edgeButtonSize}px`
    }
    if (removeButtonsRect.top < containerTop) {
      this._removeButtons.style.top = `${containerTop}px`
    }
    if (removeButtonsRect.top + this._edgeButtonSize > containerBottom) {
      this._removeButtons.style.top = `${containerBottom - this._edgeButtonSize}px`
    }

    // Move the buttons if the cell is visible.
    if (cellIsOnScreen) {
      this._addTopButton.style.top = `${cellTop - this._edgeButtonSize / 2}px`
      this._addTopButton.style.left = `${cellLeft + cellWidth / 2 - this._edgeButtonSize / 2}px`
      this._addBottomButton.style.top = `${cellBottom - this._edgeButtonSize / 2}px`
      this._addBottomButton.style.left = `${cellLeft + cellWidth / 2 - this._edgeButtonSize / 2}px`
      this._addLeftButton.style.top = `${cellTop + cellHeight / 2 - this._edgeButtonSize / 2}px`
      this._addLeftButton.style.left = `${cellLeft - this._edgeButtonSize / 2}px`
      this._addRightButton.style.top = `${cellTop + cellHeight / 2 - this._edgeButtonSize / 2}px`
      this._addRightButton.style.left = `${cellRight - this._edgeButtonSize / 2}px`

      // Now we can get the bounding boxes of the four buttons
      const topButtonRect = this._addTopButton.getBoundingClientRect()
      const bottomButtonRect = this._addBottomButton.getBoundingClientRect()
      const leftButtonRect = this._addLeftButton.getBoundingClientRect()
      const rightButtonRect = this._addRightButton.getBoundingClientRect()

      // Then make sure the buttons are actually fully visible when nearing the top edge ...
      if (topButtonRect.top < containerTop) {
        this._addTopButton.style.top = `${containerTop}px`
      }
      if (bottomButtonRect.top < containerTop) {
        this._addBottomButton.style.top = `${containerTop}px`
      }
      if (leftButtonRect.top < containerTop) {
        this._addLeftButton.style.top = `${containerTop}px`
      }
      if (rightButtonRect.top < containerTop) {
        this._addRightButton.style.top = `${containerTop}px`
      }

      // ... and when nearing the bottom edge.
      if (topButtonRect.top + this._edgeButtonSize > containerBottom) {
        this._addTopButton.style.top = `${containerBottom - this._edgeButtonSize}px`
      }
      if (bottomButtonRect.top + this._edgeButtonSize > containerBottom) {
        this._addBottomButton.style.top = `${containerBottom - this._edgeButtonSize}px`
      }
      if (leftButtonRect.top + this._edgeButtonSize > containerBottom) {
        this._addLeftButton.style.top = `${containerBottom - this._edgeButtonSize}px`
      }
      if (rightButtonRect.top + this._edgeButtonSize > containerBottom) {
        this._addRightButton.style.top = `${containerBottom - this._edgeButtonSize}px`
      }
    } else {
      // Hide the buttons as the cell is not visible.
      this._addTopButton.style.top = '-1000px'
      this._addBottomButton.style.top = '-1000px'
      this._addLeftButton.style.top = '-1000px'
      this._addRightButton.style.top = '-1000px'
    }
  }

  /**
   * Displays the edge buttons for adding rows, columns, alignment and removal.
   */
  _showEdgeButtons (): void {
    if (this._edgeButtonsVisible) {
      return
    }

    // Attach all buttons to the DOM
    document.body.appendChild(this._addTopButton)
    document.body.appendChild(this._addBottomButton)
    document.body.appendChild(this._addLeftButton)
    document.body.appendChild(this._addRightButton)
    document.body.appendChild(this._alignButtons)
    document.body.appendChild(this._removeButtons)

    this._recalculateEdgeButtonPositions()
  }

  /**
   * Removes the edge buttons from the DOM.
   */
  _hideEdgeButtons (): void {
    if (!this._edgeButtonsVisible) {
      return
    }

    // Hide the edge detection buttons again
    this._addTopButton.parentElement?.removeChild(this._addTopButton)
    this._addBottomButton.parentElement?.removeChild(this._addBottomButton)
    this._addLeftButton.parentElement?.removeChild(this._addLeftButton)
    this._addRightButton.parentElement?.removeChild(this._addRightButton)
    this._alignButtons.parentElement?.removeChild(this._alignButtons)
    this._removeButtons.parentElement?.removeChild(this._removeButtons)
  }

  /**
   * Returns true if the edge buttons are visible (i.e. attached to the DOM)
   *
   * @return  {boolean} True if the buttons are currently within the DOM
   */
  get _edgeButtonsVisible (): boolean {
    return this._addTopButton.parentElement !== null &&
      this._addBottomButton.parentElement !== null &&
      this._addLeftButton.parentElement !== null &&
      this._addRightButton.parentElement !== null &&
      this._alignButtons.parentElement !== null &&
      this._removeButtons.parentElement !== null
  }

  /**
   * Returns the DOM representation of the table
   */
  get domElement (): HTMLTableElement {
    return this._elem
  }

  /**
   * Rebuilds the Abstract Syntax Tree after something has changed. Optionally
   * notifies the callback, if given.
   * @return {void} Does not return.
   */
  _signalContentChange (): void {
    // Now inform the caller that the table has changed with this object.
    if (this._options.onChange !== undefined) {
      this._options.onChange(this)
    }
  }

  /**
  * Returns the Markdown table representation of this table
  * @returns {string} The markdown table
  */
  getMarkdownTable (): string {
    // Determine which table to output, based on the _mdTableType
    switch (this._mdTableType) {
      case 'simple':
        return buildSimpleTable(this._ast, this._colAlignment)
      case 'grid':
        return buildGridTable(this._ast, this._colAlignment)
      default:
        return buildPipeTable(this._ast, this._colAlignment)
    }
  }

  /**
   * Moves the curser to the previous column, switching rows if necessary.
   * @return {void} Does not return.
   */
  previousCell (): void {
    // We're already in the first cell
    if (this._cellIndex === 0 && this._rowIndex === 0) return

    // Focuses the previous cell of the table
    this._cellIndex--

    if (this._cellIndex < 0) {
      // Move to previous row, last cell
      this._rowIndex--
      this._cellIndex = this._cols - 1 // Zero-based indexing
    }

    this.selectCell()
    this._options.onCellChange?.(this)
  }

  /**
   * Moves the cursor to the next cell, passing over rows, if necessary.
   * Can add new rows as you go.
   * @param  {Boolean} [automaticallyAddRows=true] Whether to add new rows.
   * @return {void}                              Does not return.
   */
  nextCell (automaticallyAddRows = true): void {
    // Focuses the next cell of the table
    let newCellIndex = this._cellIndex + 1
    let newRowIndex = this._rowIndex

    if (newCellIndex === this._cols) {
      newRowIndex++
      newCellIndex = 0
    }

    if (newRowIndex === this._rows) {
      if (automaticallyAddRows) {
        this.appendRow()
      } else {
        return // We should not add new rows here
      }
    }

    // Set the correct indices
    this._cellIndex = newCellIndex
    this._rowIndex = newRowIndex

    this.selectCell()
    this._options.onCellChange?.(this)
  }

  /**
   * Moves the cursor to the same column, previous row.
   * @return {void} Does not return.
   */
  previousRow (): void {
    // Focuses the same cell in the previous row
    if (this._rowIndex === 0) {
      return // We're already in the first row
    }

    this._rowIndex--

    this.selectCell()
    this._options.onCellChange?.(this)
  }

  /**
   * Moves the cursor to the same column, next row. Can also add new
   * rows, if you wish so.
   * @param  {Boolean} [automaticallyAddRows=true] Whether or not to add new rows.
   * @return {void}                              Does not return.
   */
  nextRow (automaticallyAddRows = true): void {
    // Focuses the same cell in the next row
    let newRowIndex = this._rowIndex + 1

    if (newRowIndex === this._rows) {
      if (automaticallyAddRows) {
        this.appendRow()
      } else {
        return // We should not add new rows here
      }
    }

    // Set the new index and select the cell
    this._rowIndex = newRowIndex
    this.selectCell()
    this._options.onCellChange?.(this)
  }

  /**
   * Prepends a column to the left of the currently active cell of the table.
   * @return {void} Does not return.
   */
  prependCol (): void {
    // Add a column to the left of the active cell -> add a TD child to all TRs
    for (let i = 0; i < this._ast.length; i++) {
      this._ast[i].splice(this._cellIndex, 0, '')
    }

    this._colAlignment.splice(this._cellIndex, 0, 'left')
    this._cols++
    this._rebuildDOMElement()

    this._signalContentChange() // Notify the caller
  }

  /**
   * Appends a column at the right side of the currently active cell of the table.
   * @return {void} Does not return.
   */
  appendCol (): void {
    // Add a column to the right of the table -> add a TD child to all TRs
    for (let i = 0; i < this._ast.length; i++) {
      this._ast[i].splice(this._cellIndex + 1, 0, '')
    }

    this._colAlignment.splice(this._cellIndex + 1, 0, 'left')
    this._cols++
    this._rebuildDOMElement()

    // Move into the next cell of the current row
    this.nextCell()
    this._signalContentChange() // Notify the caller
  }

  /**
   * Prepends a row to the top of the currently active cell of the table.
   * @return {void} Does not return.
   */
  prependRow (): void {
    // Prepend a whole row to the currently active cell
    const cells = []
    for (let i = 0; i < this._cols; i++) {
      cells.push('')
    }

    this._ast.splice(this._rowIndex, 0, cells)
    this._rows++
    this._rebuildDOMElement()

    this._signalContentChange() // Notify the caller
  }

  /**
   * Appends a row at the end of the table.
   * @return {void} Does not return.
   */
  appendRow (): void {
    // Append a whole row to the table
    const cells = []
    for (let i = 0; i < this._cols; i++) {
      cells.push('')
    }

    this._ast.splice(this._rowIndex + 1, 0, cells)
    this._rows++
    this._rebuildDOMElement()

    this.nextRow()
    this._recalculateEdgeButtonPositions()
    this._signalContentChange() // Notify the caller
  }

  /**
   * Removes the currently active row from the table.
   * @return {void} Does not return.
   */
  pluckRow (): void {
    // Do not remove the last row
    if (this._rows === 1) {
      return
    }

    // Removes the current row from the table
    let rowToRemove = this._rowIndex
    let firstRow = rowToRemove === 0

    if (firstRow) {
      this._rowIndex++
    } else {
      this._rowIndex--
    }
    this.selectCell()

    // Now pluck the row.
    this._ast.splice(rowToRemove, 1)
    this._rows--
    // Select "the" cell again (to move back to the original position)
    this._rebuildDOMElement()

    if (firstRow) {
      this._rowIndex = 0
      this.selectCell()
    }

    this._signalContentChange() // Notify the caller
    this._options.onCellChange?.(this)
  }

  /**
   * Removes the currently active column from the table.
   * @return {void} Does not return.
   */
  pluckCol (): void {
    // Do not remove the last column.
    if (this._cols === 1) {
      return
    }

    // Removes the current column from the table
    let colToRemove = this._cellIndex
    let firstCol = colToRemove === 0

    if (firstCol) {
      this._cellIndex = 1
    } else {
      this._cellIndex--
    }
    this.selectCell()

    // Now pluck the column.
    for (let i = 0; i < this._ast.length; i++) {
      this._ast[i].splice(colToRemove, 1)
    }

    this._colAlignment.splice(colToRemove, 1)
    this._cols--
    this._rebuildDOMElement()

    if (firstCol) {
      this._cellIndex = 0
      this.selectCell()
    }

    this._signalContentChange() // Notify the caller
    this._options.onCellChange?.(this)
  }

  /**
  *
  * @param {string} alignment The new alignment - left, center, or right
  * @param {number} col The column index to change
  */
  changeColAlignment (alignment: ColAlignment, col = this._cellIndex): void {
    if (![ 'left', 'center', 'right' ].includes(alignment)) {
      throw new Error('Wrong column alignment provided! ' + alignment)
    }

    if (col >= this._cols || col < 0) {
      throw new Error('Could not align column - Index out of bounds: ' + col.toString())
    }

    this._colAlignment[col] = alignment

    // Change the visual alignment
    for (let row = 0; row < this._rows; row++) {
      this._elem.rows[row].cells[col].style.textAlign = alignment
    }

    this._signalContentChange() // Recalculate everything
    this._options.onCellChange?.(this)
  }

  /**
  * Selects the current cell
  */
  selectCell (): void {
    this._elem.rows[this._rowIndex].cells[this._cellIndex].focus()
    this._recalculateEdgeButtonPositions()
  }

  /**
   * Injects the necessary CSS into the DOM, making sure it comes before any other
   * CSS sources so you can override the styles, if you wish.
   * @return {void} Does not return.
   */
  _injectCSS (): void {
    if (document.getElementById('tableHelperCSS') !== null) {
      return // CSS already present
    }

    // Create the styles
    const styleElement = computeCSS(this._edgeButtonSize)
    document.head.prepend(styleElement)
  }

  /**
   * Selects the complete text contents of a given element.
   * @param {DOMNode} el The element which contents should be selected.
   */
  _selectElementContents (el: Node): void {
    // Selects the text contents of a given element.
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()

    if (sel !== null) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  /**
   * Calculates the position of the caret in the given DOM element.
   * @param {DOMNode} elem The element in which we should compute the caret position
   */
  _getCursorPositionInElement (elem: ParentNode): number {
    let caretPos = 0
    let sel
    let range

    sel = window.getSelection()
    if (sel !== null && sel.rangeCount > 0) {
      range = sel.getRangeAt(0)
      if (range.commonAncestorContainer.parentNode === elem) {
        caretPos = range.endOffset
      }
    }

    return caretPos
  }
}
