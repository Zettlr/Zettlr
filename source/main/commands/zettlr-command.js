/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrCommand class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class represents the base for all commands that can be
 *                  issued from the renderer, such as creating files, removing
 *                  directories, etc. Other command classes should extend it and
 *                  implement specific behaviour.
 *
 * END HEADER
 */

class ZettlrCommand {
  constructor (app, bindEvent) {
    // The app is the api entry point for all things we can do.
    this._app = app

    // The bind event is the event that is sent from the renderer
    if (!bindEvent) throw new Error('The binding event name must be given!')
    if (!Array.isArray(bindEvent)) bindEvent = [bindEvent]
    this._bind = bindEvent

    // Can be optionally used to bind shortcuts to the bind events.
    this._shortcuts = []

    // Contains a list of all event names for that user shortcuts are accepted.
    this._userDefinedShortcuts = []
  }

  /**
   * Returns the event name this thing binds to
   * @return {String} The event name
   */
  getEvents () { return JSON.decode(JSON.stringify(this._bind)) }

  /**
   * Returns true, if this command responds to the given event name
   * @param  {String} evt The event name.
   * @return {Boolean}     True or false, depending on the bind events.
   */
  respondsTo (evt) { return this._bind.includes(evt) }

  /**
   * Defines the given array of events to be user-shortcutable events.
   * @param {Array} events An array of events that receive user defined shortcuts.
   */
  setCustomShortcuts (events) {
    if (!Array.isArray(events)) events = [events]
    this._userDefinedShortcuts = events
  }

  /**
   * Returns the list of user definable shortcuts
   * @return {Array} The list of shortcuts
   */
  getCustomShortcuts () { return JSON.decode(JSON.stringify(this._userDefinedShortcuts)) }

  /**
   * Returns the shortcuts currently assigned to this command.
   * @return {Array} All shortcuts.
   */
  getShortcuts () { return JSON.decode(JSON.stringify(this._shortcuts)) }

  /**
   * Sets the shortcut for an event this command responds to
   * @param {String} shortcut The shortcut
   * @return {Boolean} Whether or not the shortcut was set
   */
  registerShortcut (evt, shortcut) {
    // Does this command respond to the given shortcut?
    if (!this.respondsTo(evt)) return false
    // Is there already a shortcut for the event?
    if (this.getShortcuts().includes(evt)) return false

    this._shortcuts.push({
      'event': evt,
      'shortcut': shortcut
    })

    return true
  }

  /**
   * Unregisters a shortcut from this command.
   * @param  {String} evt The event, whose shortcut the caller wants to unregister.
   * @return {Boolean}     Whether or not the shortcut was unset.
   */
  unregisterShortcut (evt) {
    let found = this._shortcuts.find(elem => elem.event === evt)

    if (found) {
      this._shortcuts.splice(this._shortcuts.indexOf(found), 1)
      return true
    }

    return false
  }

  /**
   * Indicates whether or not a shortcut is available for this command.
   * @return {Boolean} True or false, depending on the state.
   */
  hasShortcuts () { return (this._shortcuts.length > 0) }
}

module.exports = ZettlrCommand
