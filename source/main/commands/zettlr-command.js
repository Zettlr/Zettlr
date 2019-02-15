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
    this._bind = bindEvent

    // Can be optionally used to bind a shortcut to it
    this._shortcut = null

    // Indicates whether or not this command can be assigned a shortcut
    this._canHaveShortcut = false
  }

  /**
   * Returns the event name this thing binds to
   * @return {String} The event name
   */
  getEventName () { return this._bind }

  /**
   * Returns the shortcut currently assigned to this command.
   * @return {String} The shortcut as text (or null, if unset)
   */
  getShortcut () { return (this.isShortcutable()) ? this._shortcut : null }

  /**
   * Sets the shortcut for this command
   * @param {String} shortcut The shortcut
   */
  setShortcut (shortcut) { if (this.isShortcutable()) this._shortcut = shortcut }

  /**
   * Activates or deactivates the shortcut function
   * @param {Boolean} flag Whether or not this command should have a shortcut.
   */
  setShortcutable (flag) { this._canHaveShortcut = flag }
  /**
   * Indicates whether or not a shortcut may be set for this command.
   * @return {Boolean} True or false, depending on the state.
   */
  isShortcutable () { return this._canHaveShortcut }
}

module.exports = ZettlrCommand
