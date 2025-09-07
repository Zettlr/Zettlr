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

import { type AppServiceContainer } from '../../app-service-container'

export default abstract class ZettlrCommand {
  protected readonly _app: AppServiceContainer
  protected readonly _bind: string[]

  /**
   * Derived classes must implement this method which will be called upon request.
   *
   * @param   {string}        evt  Accepts any one of the events declared in _bind
   * @param   {any<any>}      arg  Any arguments that are required for the command
   *
   * @return  {Promise<any>}       The run method must run asynchronously.
   */
  abstract run (evt: string, arg: any): Promise<any>

  constructor (app: AppServiceContainer, bindEvent: string|string[]) {
    // The app is the api entry point for all things we can do.
    this._app = app

    // The bind event is the event that is sent from the renderer
    if (!Array.isArray(bindEvent)) {
      bindEvent = [bindEvent]
    }
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
