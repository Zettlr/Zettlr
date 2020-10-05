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

const isFunction = require('../../../common/util/is-function')

class ZettlrPopup {
  /**
    * Display the popup
    * @param {Element} elem            The DOM element to which the popup should bind itself.
    * @param {String} content         The content of the popup (a HTML string)
    * @param {Function} [callback=null] A callback to be called when the popup is closed.
    */
  constructor (elem, content, callback = null) {
    this._cnt = content // The popup contents
    this._callback = callback // Function to be called on close
    this._elem = elem
    this._persistent = false // Should the popup stay open even on form submit?

    // We need to be able to compute an offset. It may be that the given element
    // is non existent (jQuery will always at least return an object that evals
    // to true), so check that we can compute an offset, and if we can't, fall
    // back to the toolbar, so that the popup is displayed centered where the
    // user will be able to find it either way.
    if (this._elem === null || this._elem === undefined) {
      this._elem = document.getElementById('#toolbar')
    }

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

    this._popup = document.createElement('div')
    this._popup.classList.add('popup')
    this._arrow = document.createElement('div')
    this._arrow.classList.add('popup-arrow')
    this._popup.innerHTML = this._cnt
    document.body.appendChild(this._popup)
    document.body.appendChild(this._arrow)

    // Activate forms
    this._popup.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault()
        if (this._persistent) return // Prevent default but do not yet close
        this.close()
      })
    })

    // If there is a form, autoselect the content of its first input
    const popupInput = this._popup.querySelector('input')
    if (popupInput) {
      popupInput.focus()
      popupInput.select()
      popupInput.addEventListener('keyup', (e) => {
        // Abort on escape
        if (e.key === 'Escape') this.close(true)
      })
    }

    // Place
    this._place()
  }

  /**
   * Determines if the popup should be closed on click.
   * @param {Event} event The event fired
   */
  _onClickHandler (event) {
    // Clicks on the popup itself are cool
    if (event.target === this._popup) return
    // And so are any clicks on elements within this.
    // Background for the following line:
    // https://github.com/Zettlr/Zettlr/issues/554
    if (this._popup.contains(event.target)) return

    let x = event.clientX
    let y = event.clientY

    // Now determine where the popup is
    let minX = this._popup.offsetLeft
    let maxX = minX + this._popup.offsetWidth
    let minY = this._popup.offsetTop
    let maxY = minY + this._popup.offsetHeight

    if (x < minX || maxX < x || y < minY || maxY < y) {
      // Clicked outside the popup -> close it
      this.close(true)
    }
  }

  /**
   * Resizes and moves a popup on resizing.
   * @param {Event} event The event object
   */
  _onResizeHandler (event) { this._place() }

  /**
    * Places the popup relative to the target element.
    * @return {void} Nothing to return.
    */
  _place () {
    // First, reset any applied styles to the elements
    this._popup.style.height = ''
    this._popup.style.width = ''
    this._popup.style.left = ''
    this._popup.style.top = ''
    this._arrow.style.left = ''
    this._arrow.style.top = ''
    this._arrow.classList.remove('up', 'down', 'left', 'right')

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
      this._popup.style.top = (this._y + 5) + 'px' // 5px margin for arrow
      if ((this._x + width / 2) > (window.innerWidth - 10)) { // 10px margin to document
        this._popup.style.left = (window.innerWidth - width - 10) + 'px' // 10px margin to document
      } else if (this._x - width / 2 < 10) { // 10px margin to document
        this._popup.style.left = '10px' // 10px margin to document
      } else {
        this._popup.style.left = (this._x - width / 2) + 'px' // Place centered under element
      }

      this._arrow.style.top = (top + elemRect.height) + 'px'
      this._arrow.style.left = (left + elemRect.width / 2 - this._arrow.offsetWidth / 2) + 'px'

      // Ensure the popup is completely visible (move inside the document if it's at an edge)
      if (this._popup.offsetLeft + this._popup.offsetWidth > window.innerWidth - 10) {
        this._popup.style.left = (window.innerWidth - this._popup.offsetWidth - 10) + 'px'
      } if (this._popup.offsetLeft < 10) {
        this._popup.style.left = '10px'
      }

      // Ensure the popup is not higher than the window itself (can happen,
      // e.g., with the formatting popup)
      if (height > window.innerHeight - 20 - this._y) {
        this._popup.style.height = (window.innerHeight - 20 - this._y) + 'px'
        height = this._popup.offsetHeight
      }
    } else if (right > width + 10 && height <= window.innerHeight - 20 - this._y) {
      // We can place it right of the element
      // Therefore re-compute x and y
      this._x = elemRect.left + elemRect.width
      this._y = elemRect.top + elemRect.height / 2
      this._arrow.classList.add('left')
      this._popup.style.left = (this._x + 5) + 'px'
      if (this._y + height / 2 > window.innerHeight - 5) {
        this._popup.style.top = (window.innerHeight - height - 5) + 'px'
      } else {
        this._popup.style.top = (this._y - height / 2) + 'px'
      }
      this._arrow.style.left = (left + elemRect.width) + 'px'
      this._arrow.style.top = (top + elemRect.height / 2 - this._arrow.offsetHeight / 2) + 'px'

      // Ensure the popup is completely visible (move inside the document if it's at an edge)
      if (this._popup.offsetTop + this._popup.offsetHeight > window.innerHeight - 10) {
        this._popup.style.top = (window.innerHeight - this._popup.offsetHeight - 10) + 'px'
      } if (this._popup.offsetTop < 10) {
        this._popup.style.top = '10px'
      }
    } else {
      // Above
      // Therefore re-compute x and y
      this._x = elemRect.left + elemRect.width / 2
      this._y = elemRect.top
      this._arrow.classList.add('down')
      this._popup.style.top = (this._y - height - 5) + 'px'
      if (this._x + width / 2 > window.innerWidth - 5) {
        this._popup.style.left = (window.innerWidth - width - 5) + 'px'
      } else {
        this._popup.style.left = (this._x - width / 2) + 'px'
      }
      this._arrow.style.top = top - 5 + 'px'
      this._arrow.style.left = (left + elemRect.width / 2 - this._arrow.offsetWidth / 2) + 'px'

      // Ensure the popup is completely visible (move inside the document if it's at an edge)
      if (this._popup.offsetLeft + this._popup.offsetWidth > window.innerWidth - 10) {
        this._popup.style.left = (window.innerWidth - this._popup.offsetWidth - 10) + 'px'
      } if (this._popup.offsetLeft < 10) {
        this._popup.style.left = '10px'
      }
    }
  }

  /**
    * Closes the popup and calls the callback, if given
    * @param  {Boolean} [abort=false] Should we send the form if there is one?
    * @return {void}                Nothing to return.
    */
  close (abort = false) {
    // Don't close twice
    if (this._arrow === null || this._popup === null) return

    if (isFunction(this._callback)) {
      if (this._popup.querySelector('form') !== null && !abort) {
        let formData = []
        let elements = this._popup.querySelector('form').elements
        for (const element of elements) {
          formData.push({
            'name': element.name,
            'value': element.value
          })
        }

        this._callback(formData)
      } else {
        this._callback(null)
      }
    }

    this._arrow.parentElement.removeChild(this._arrow)
    this._popup.parentElement.removeChild(this._popup)
    this._arrow = null
    this._popup = null

    document.removeEventListener('mousedown', this._boundClickHandler)
    document.removeEventListener('contextmenu', this._boundClickHandler)
    window.removeEventListener('resize', this._boundResizeHandler)
  }

  /**
    * Make the popup persistent (i.e. it can only be closed via click on the modal, not by form submission)
    */
  makePersistent () {
    this._persistent = true
  }

  /**
   * Can be called programmatically to indicate that the size of the popup may
   * have changed.
   * @return {void} Does not return.
   */
  change () {
    this._place()
  }
}

/**
 * Creates a new popup and returns the instance
 *
 * @param   {Element}        element   An element to anchor the popup at
 * @param   {Object}         content   An object containing properties to fill the template with
 * @param   {Function|null}  callback  An optional callback function
 *
 * @return  {Popup}                    The instantiated popup
 */
module.exports = function (element, content, callback = null) {
  return new ZettlrPopup(element, content, callback)
}
