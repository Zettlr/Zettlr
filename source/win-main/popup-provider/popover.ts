/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Popup class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a popup close to the target element.
 *                  The Popup features a class that can be instantiated to
 *                  pop up small tooltip style windows that can hold some
 *                  content. It can be used to offer small pieces of
 *                  configuration or simply hold text.
 *
 * END HEADER
 */

import Vue from 'vue'

const ARROW_SIZE = 20 // in pixels

export default class ZettlrPopover {
  private readonly _callback: (data: any) => void
  private readonly _elem: HTMLElement
  private _x: number
  private _y: number
  private readonly _boundClickHandler: (event: MouseEvent) => void
  private readonly _boundResizeHandler: (event: UIEvent) => void
  private readonly _popup: HTMLElement
  private readonly _popover: Vue
  private readonly _arrow: HTMLElement
  private readonly _watcher: Function

  /**
    * Creates and mounts a new popup
    *
    * @param  {string}         content          The content of the popup (a HTML string)
    * @param  {HTMLElement}    elem             The target element
    * @param  {Function|null}  [callback=null]  A callback to which the popover data will be sent
    */
  constructor (
    component: typeof Vue,
    elem: HTMLElement,
    initialData: any,
    callback: (data: any) => void
  ) {
    this._elem = elem
    this._callback = callback

    // Where the small arrow should point to.
    this._x = 0
    this._y = 0

    // Set up the event listeners
    this._boundClickHandler = this._onClickHandler.bind(this)
    this._boundResizeHandler = this._onResizeHandler.bind(this)
    // Only bind mousedowns so that the user may release the mouse
    // outside of the popup without closing it.
    document.addEventListener('mousedown', this._boundClickHandler)
    document.addEventListener('contextmenu', this._boundClickHandler)
    window.addEventListener('resize', this._boundResizeHandler)

    // Create the container and append it to the DOM
    this._popup = document.createElement('div')
    this._popup.classList.add('popover')
    const popoverMountPoint = document.createElement('div')
    this._popup.appendChild(popoverMountPoint)
    this._arrow = document.createElement('div')
    this._arrow.classList.add('popover-arrow')
    document.body.appendChild(this._popup)
    document.body.appendChild(this._arrow)

    // Create the Vue instance and mount it into the popover container
    this._popover = new Vue(component)
    // Preset the data with initial values
    for (const key in initialData) {
      Vue.set(this._popover.$data, key, initialData[key])
    }
    // We need to mount it onto a div inside our container because the Vue component will replace the mount point
    this._popover.$mount(popoverMountPoint)

    // Notify the caller whenever the result-property changes. NOTE that each
    // component that is being used as a popover MUST expose the computed
    // property popoverData, which can either contain a primitive value or an
    // object collecting several values.
    this._watcher = this._popover.$watch('popoverData', (newValue, oldValue) => {
      this._callback(newValue)
    }, { deep: true })

    // Place
    this._place()
  }

  /**
   * Determines if the popup should be closed on click.
   *
   * @param  {MouseEvent}  event  The event fired
   */
  _onClickHandler (event: MouseEvent): void {
    // Clicks on the popup itself are cool
    if (event.target === this._popup || event.target === null) {
      return
    }
    // And so are any clicks on elements within this.
    // Background for the following line:
    // https://github.com/Zettlr/Zettlr/issues/554
    if (this._popup.contains(event.target as Node)) {
      return
    }

    let x = event.clientX
    let y = event.clientY

    // Now determine where the popup is
    let minX = this._popup.offsetLeft
    let maxX = minX + this._popup.offsetWidth
    let minY = this._popup.offsetTop
    let maxY = minY + this._popup.offsetHeight

    if (x < minX || maxX < x || y < minY || maxY < y) {
      // Clicked outside the popup -> close it
      this.close()
    }
  }

  /**
   * Resizes and moves a popup on resizing.
   *
   * @param  {UIEvent}  event  The event object
   */
  _onResizeHandler (event: UIEvent): void {
    this._place()
  }

  /**
    * Places the popup relative to the target element.
    */
  _place (): void {
    // First, reset any applied styles to the elements
    this._popup.style.height = ''
    this._popup.style.width = ''
    this._popup.style.left = ''
    this._popup.style.top = ''
    this._arrow.style.left = ''
    this._arrow.style.top = ''
    this._arrow.classList.remove('up', 'down', 'left', 'right')

    // Windows doesn't have arrows on their popovers, just as they call them
    // "flyouts" instead of PopOvers. So on Windows we shouldn't show them.
    const showArrow = process.platform !== 'win32'
    const arrowSize = (showArrow) ? ARROW_SIZE : 10 // Windows gets 10px margin

    let elemRect = this._elem.getBoundingClientRect()

    this._x = elemRect.left + elemRect.width / 2
    this._y = elemRect.top + elemRect.height

    let height = this._popup.offsetHeight
    let width = this._popup.offsetWidth

    // First find on which side there is the most space.
    let top = elemRect.top
    let left = elemRect.left
    let right = window.innerWidth - left - elemRect.width
    let bottom = window.innerHeight - top - elemRect.height

    // 10px: arrow plus the safety-margin
    if (bottom > height + 10 || elemRect.top < 50) {
      // Below element
      this._arrow.classList.add('up')
      this._popup.style.top = `${this._y + arrowSize}px` // 5px margin for arrow
      if ((this._x + width / 2) > (window.innerWidth - 10)) { // 10px margin to document
        this._popup.style.left = `${window.innerWidth - width - 10}px` // 10px margin to document
      } else if (this._x - width / 2 < 10) { // 10px margin to document
        this._popup.style.left = '10px' // 10px margin to document
      } else {
        this._popup.style.left = `${this._x - width / 2}px` // Place centered under element
      }

      if (showArrow) {
        this._arrow.style.top = `${top + elemRect.height}px`
        this._arrow.style.left = `${left + elemRect.width / 2 - this._arrow.offsetWidth / 2}px`
      }

      // Ensure the popup is completely visible (move inside the document if it's at an edge)
      if (this._popup.offsetLeft + this._popup.offsetWidth > window.innerWidth - 10) {
        this._popup.style.left = `${window.innerWidth - this._popup.offsetWidth - 10}px`
      } if (this._popup.offsetLeft < 10) {
        this._popup.style.left = '10px'
      }

      // Ensure the popup is not higher than the window itself
      if (height > window.innerHeight - 20 - this._y) {
        this._popup.style.height = `${window.innerHeight - 20 - this._y}px`
        height = this._popup.offsetHeight
      }
    } else if (right > width + 10 && height <= window.innerHeight - 20 - this._y) {
      // We can place it right of the element
      // Therefore re-compute x and y
      this._x = elemRect.left + elemRect.width
      this._y = elemRect.top + elemRect.height / 2
      this._popup.style.left = `${this._x + arrowSize}px`
      if (this._y + height / 2 > window.innerHeight - arrowSize) {
        this._popup.style.top = `${window.innerHeight - height - arrowSize}px`
      } else {
        this._popup.style.top = `${this._y - height / 2}px`
      }

      if (showArrow) {
        this._arrow.classList.add('left')
        this._arrow.style.left = `${left + elemRect.width}px`
        this._arrow.style.top = `${top + elemRect.height / 2 - this._arrow.offsetHeight / 2}px`
      }

      // Ensure the popup is completely visible (move inside the document if it's at an edge)
      if (this._popup.offsetTop + this._popup.offsetHeight > window.innerHeight - 10) {
        this._popup.style.top = `${window.innerHeight - this._popup.offsetHeight - 10}px`
      } if (this._popup.offsetTop < 10) {
        this._popup.style.top = '10px'
      }
    } else {
      // Above
      // Therefore re-compute x and y
      this._x = elemRect.left + elemRect.width / 2
      this._y = elemRect.top
      this._popup.style.top = `${this._y - height - arrowSize}px`
      if (this._x + width / 2 > window.innerWidth - arrowSize) {
        this._popup.style.left = `${window.innerWidth - width - arrowSize}px`
      } else {
        this._popup.style.left = `${this._x - width / 2}px`
      }

      if (showArrow) {
        this._arrow.classList.add('down')
        this._arrow.style.top = `${top - arrowSize}px`
        this._arrow.style.left = `${left + elemRect.width / 2 - this._arrow.offsetWidth / 2}px`
      }

      // Ensure the popup is completely visible (move inside the document if it's at an edge)
      if (this._popup.offsetLeft + this._popup.offsetWidth > window.innerWidth - 10) {
        this._popup.style.left = `${window.innerWidth - this._popup.offsetWidth - 10}px`
      } if (this._popup.offsetLeft < 10) {
        this._popup.style.left = '10px'
      }
    }
  }

  /**
    * Closes the popover.
    */
  close (): void {
    // Don't close twice
    if (this._arrow === null || this._popup === null) {
      return
    }

    this._watcher() // Calling this function unwatches the Vue instance
    this._arrow.parentElement?.removeChild(this._arrow)
    this._popup.parentElement?.removeChild(this._popup)

    document.removeEventListener('mousedown', this._boundClickHandler)
    document.removeEventListener('contextmenu', this._boundClickHandler)
    window.removeEventListener('resize', this._boundResizeHandler)
  }

  /**
   * Can be called programmatically to indicate that the size of the popup may
   * have changed.
   * @return {void} Does not return.
   */
  change (): void {
    this._place()
  }
}
