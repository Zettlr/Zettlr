/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrNotification class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays Operating Style system notifications
 *
 * END HEADER
 */

const MARGIN = 10 // 10 px margin between all notifications
const OFFSET = 49 + 25 // The offset from the top of the window (toolbar + margin + tabbar)

/**
 * This is one of the shortest classes in Zettlr, as it only displays small
 * notification badges in the upper right edge of the window to notify the user,
 * e.g, for remote changes on disk or such things.
 */
class ZettlrNotification {
  /**
    * Show a new notification.
    * @param {ZettlrBody} parent   The Zettlr body object.
    * @param {String} message  The message that should be displayed
    */
  constructor (parent, message) {
    this._parent = parent
    this._messageExpanded = false
    this._closeTimeout = null
    this._div = $('<div>').addClass('notify')
    // Trim overly long messages
    let msg = message
    if (message.length > 110) msg = msg.substr(0, 100) + ' &hellip;'
    this._div.html(msg)
    $('body').append(this._div)

    // Place the nofitication
    this._place()

    this._div.on('click', (e) => {
      // If the message was too long, on first click expand the message to full
      // length
      if (message.length > 110 && !this._messageExpanded) {
        this._div.html(message)
        this._messageExpanded = true
        // Cancel the timeout. Now the user has to manually close the
        // notification, but s/he has time to read the full thing.
        clearTimeout(this._closeTimeout)
        return
      }

      this.close()
    })

    // Set the auto timeout (can be canceled if the message is too long)
    this._closeTimeout = setTimeout(() => { this.close() }, 5000)
  }

  /**
   * Close the notification
   * @return {void} Nothing to return.
   */
  close () {
    this._div.animate({
      opacity: 0
    }, 200, () => {
      // Complete -> remove
      this._div.detach()
      this._parent.notifySplice(this)
    })
  }

  /**
    * Indicate that some other notification has been removed -- in this case
    * move the notification up by re-placing it.
    * @return {void} Nothing to return.
    */
  moveUp () { this._place() }

  _place () {
    // First find out where we should put ourselves.
    let h = OFFSET // Begin with the initial margin (from the top of the window)
    let thisElem = this._div[0]
    $('body').children('.notify').each(function (index) {
      if (this !== thisElem) {
        h += $(this).outerHeight() + MARGIN
      } else {
        return false // Stop the loop
      }
    })

    // Place it! If it's the first notification (h = Margin), simply show it.
    // Otherwise, move it down. Use the default duration of 400ms.
    if (h === OFFSET && parseInt(this._div.css('top')) <= OFFSET) {
      this._div.css('top', h + 'px')
    } else {
      this._div.animate({ 'top': h + 'px' })
    }
  }
}

module.exports = ZettlrNotification
