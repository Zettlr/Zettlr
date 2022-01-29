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

import Zettlr from '../zettlr'

export default class ZettlrCommand {
  protected readonly _app: Zettlr
  protected readonly _bind: string[]
  constructor (app: Zettlr, bindEvent: string|string[]) {
    // The app is the api entry point for all things we can do.
    this._app = app

    // The bind event is the event that is sent from the renderer
    if (!Array.isArray(bindEvent)) bindEvent = [bindEvent]
    this._bind = bindEvent
  }

  /**
   * Returns the event name this thing binds to
   * @return {String} The event name
   */
  getEvents (): string[] {
    return this._bind.map(event => event)
  }

  /**
   * Returns true, if this command responds to the given event name
   * @param  {String} evt The event name.
   * @return {Boolean}     True or false, depending on the bind events.
   */
  respondsTo (evt: string): boolean {
    return this._bind.includes(evt)
  }
}
