/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrPopup class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a popup to the target element.
 *                  ZettlrPopup features a class that can be instantiated to
 *                  pop up small tooltip style windows that can hold some
 *                  content. It can be used to offer small pieces of
 *                  configuration or simply hold text. They are modal, i.e. you
 *                  can't click something else -- a click anywhere in the
 *                  window is required to hide it first.
 *
 * END HEADER
 */

/**
 * This is the native enemy of the ZettlrDialog class, because it just snatched
 * away most of the functions from it. Fundamentally, you can create objects of
 * this class to display popups on the screen. They are semi-modal, meaning that
 * they have to be closed first by clicking outside of them, or by an action that
 * can contain a callback, but they can be closed at any time. Bonus: They hook
 * into many events to stay fixed to their root element.
 */
class ZettlrPopup {
  /**
    * Display the popup
    * @param {jQuery} elem            The DOM element to which the popup should bind itself.
    * @param {Mixed} content         The content of the popup (either jQuery or text)
    * @param {Function} [callback=null] A callback to be called when the popup is closed.
    */
  constructor (elem, content, callback = null) {
    this._cnt = content // Should contain a jQuery object
    this._callback = callback // Function to be called on close
    this._elem = elem
    this._persistent = false // Should the popup stay open even on form submit?

    // Where the small arrow should point to.
    this._x = 0
    this._y = 0

    this._modal = $('<div>').css('top', '0').css('left', '0').css('bottom', '0').css('right', '0').css('position', 'absolute')

    // Close the popup either on left or right mouse click
    this._modal.on('click', (e) => {
      this.close(true)
      // Simulate a click-through after the close
      document.elementFromPoint(e.clientX, e.clientY).click()
    })
    this._modal.on('contextmenu', (e) => {
      this.close(true)
    })

    // Keep the popup relative to parent element even on resize
    $(window).on('resize', (e) => {
      this._place()
    })

    this._popup = $('<div>').addClass('popup').css('opacity', '0')
    this._arrow = $('<div>').addClass('popup-arrow')
    this._popup.append(this._cnt)
    $('body').append(this._modal)
    $('body').append(this._popup)
    $('body').append(this._arrow)

    // Activate forms
    this._popup.find('form').on('submit', (e) => {
      e.preventDefault()
      if (this._persistent) return // Prevent default but do not yet close
      this.close()
    })

    // If there is a form, autoselect the content of its first input
    this._popup.find('input').first().select().focus()
    this._popup.find('input').on('keyup', (e) => {
      if (e.which === 27) {
        // ESC
        this.close(true)
      }
    })

    // Place
    this._place()

    // Afterwards blend it in
    this._popup.animate({ 'opacity': '1' }, 200, 'swing')
  }

  /**
    * Places the popup relative to the target element.
    * @return {void} Nothing to return.
    */
  _place () {
    this._x = this._elem.offset().left + this._elem.outerWidth() / 2
    this._y = this._elem.offset().top + this._elem.outerHeight()

    let height = this._popup.outerHeight()
    let width = this._popup.outerWidth()

    // Ensure the popup is not heigher than the window itself (can happen,
    // e.g., with the formatting popup)
    if (height > window.innerHeight - 20 - this._y) {
      this._popup.css('height', (window.innerHeight - 20 - this._y) + 'px')
      height = this._popup.outerHeight()
    }

    // First find on which side there is the most space.
    let top = this._elem.offset().top
    let left = this._elem.offset().left
    let right = window.innerWidth - left - this._elem.outerWidth()
    let bottom = window.innerHeight - top - this._elem.outerHeight()

    // 10px: arrow plus the safety-margin
    if (bottom > height + 10) {
      // Below element
      this._arrow.addClass('up')
      this._popup.css('top', (this._y + 5) + 'px') // 5px margin for arrow
      if ((this._x + width / 2) > (window.innerWidth - 10)) { // 10px margin to document
        this._popup.css('left', (window.innerWidth - width - 10) + 'px') // 10px margin to document
      } else if (this._x - width / 2 < 10) { // 10px margin to document
        this._popup.css('left', '10px') // 10px margin to document
      } else {
        this._popup.css('left', (this._x - width / 2) + 'px') // Place centered under element
      }
      this._arrow.css('top', (top + this._elem.outerHeight()) + 'px')
      this._arrow.css('left', (left + this._elem.outerWidth() / 2 - this._arrow.outerWidth() / 2) + 'px')
    } else if (right > width + 10) {
      // We can place it right of the element
      // Therefore re-compute x and y
      this._x = this._elem.offset().left + this._elem.outerWidth()
      this._y = this._elem.offset().top + this._elem.outerHeight() / 2
      this._arrow.addClass('left')
      this._popup.css('left', (this._x + 5) + 'px')
      if (this._y + height / 2 > window.innerHeight - 5) {
        this._popup.css('top', (window.innerHeight - height - 5) + 'px')
      } else {
        this._popup.css('top', (this._y - height / 2) + 'px')
      }
      this._arrow.css('left', (left + this._elem.outerWidth()) + 'px')
      this._arrow.css('top', (top + this._elem.outerHeight() / 2 - this._arrow.outerHeight() / 2) + 'px')
    } else {
      // Above
      // Therefore re-compute x and y
      this._x = this._elem.offset().left + this._elem.outerWidth() / 2
      this._y = this._elem.offset().top
      this._arrow.addClass('down')
      this._popup.css('top', (this._y - height - 5) + 'px')
      if (this._x + width / 2 > window.innerWidth - 5) {
        this._popup.css('left', (window.innerWidth - width - 5) + 'px')
      } else {
        this._popup.css('left', (this._x - width / 2) + 'px')
      }
      this._arrow.css('top', top + 'px')
      this._arrow.css('left', (left + this._elem.outerWidth() / 2 - this._arrow.outerWidth() / 2) + 'px')
    }
  }

  /**
    * Closes the popup and calls the callback, if given
    * @param  {Boolean} [abort=false] Should we send the form if there is one?
    * @return {void}                Nothing to return.
    */
  close (abort = false) {
    let t = {}

    if (this._callback && t.toString.call(this._callback) === '[object Function]') {
      if (this._popup.find('form').length > 0 && !abort) {
        let f = this._popup.find('form').first().serializeArray()
        this._callback(f)
      } else {
        this._callback(null)
      }
    }

    this._modal.detach()
    this._arrow.detach()
    this._popup.animate({ 'opacity': '0' }, 200, 'swing', () => {
      this._popup.detach()
    })
  }

  /**
    * Make the popup persistent (i.e. it can only be closed via click on the modal, not by form submission)
    */
  makePersistent () {
    this._persistent = true
  }
}

function popup (element, content, callback = null) {
  return new ZettlrPopup(element, content, callback)
}

module.exports = popup
