/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RecentDocsProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Manages the list of recently viewed documents.
 *
 * END HEADER
 */

import EventEmitter from 'events'
import { app } from 'electron'

/**
* This class manages the coloured tags of the app. It reads the tags on each
* start of the app and writes them after they have been changed.
*/
export default class RecentDocsProvider extends EventEmitter {
  private _recentDocs: string[]
  /**
  * Create the instance on program start and initially load the tags.
  */
  constructor () {
    super()
    global.log.verbose('Recent documents provider booting up ...')

    this._recentDocs = [] // This array holds all recent documents

    // Register a global helper for the tag database
    global.recentDocs = {
      /**
      * Add a document to the list of recently opened documents
      * @param {Object} doc A document exposing at least the metadata of the file
      */
      add: (docPath) => {
        // First remove the document if it's already somewhere in the list
        const idx = this._recentDocs.indexOf(docPath)
        if (idx > -1) {
          this._recentDocs.splice(idx, 1)
        }

        // Push the file to the beginning
        this._recentDocs.unshift(docPath)
        // Push the file into the doc-menu if we're on macOS or Windows
        if ([ 'darwin', 'win32' ].includes(process.platform)) {
          app.addRecentDocument(docPath)
        }

        // Make sure we never exceed 10 recent docs
        if (this._recentDocs.length > 10) {
          this._recentDocs = this._recentDocs.slice(0, 10)
        }

        // Finally, announce the fact that the list of recent documents has
        // changed to whomever it may concern
        this.emit('update')
      },
      /**
      * Clears out the list of recent files
      */
      clear: (): void => {
        this._recentDocs = []
        // Clear the application's recent docs menu as well on macOS or Windows
        if ([ 'darwin', 'win32' ].includes(process.platform)) {
          app.clearRecentDocuments()
        }
        // Announce that the list of recent docs has changed
        this.emit('update')
      },
      /**
      * Retrieve the list of recent documents
      * @return {Array} A list containing all documents in the recent list
      */
      get: (): string[] => {
        // Return a copy
        return this._recentDocs.map(elem => elem)
      },
      /**
      * Registers a callback for the given event
      */
      on: (event, callback) => {
        return this.on(event, callback)
      },
      /**
      * Deregisters a callback for the given event
      */
      off: (event, callback) => {
        return this.off(event, callback)
      }
    }
  }

  /**
  * Shuts down the provider
  * @return {Boolean} Always returns true
  */
  async shutdown (): Promise<boolean> {
    global.log.verbose('Recent documents provider shutting down ...')
    return true
  }
}
