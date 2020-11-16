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

const EventEmitter = require('events')
const { app } = require('electron')

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
module.exports = class RecentDocsProvider extends EventEmitter {
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
      add: (doc) => {
        let found = this._recentDocs.find((e) => e.hash === doc.hash)
        if (found) this._recentDocs.splice(this._recentDocs.indexOf(found), 1)

        // Push the file into the global array (to the beginning)
        this._recentDocs.unshift(doc)
        // Push the file into the doc-menu if we're on macOS or Windows
        if ([ 'darwin', 'win32' ].includes(process.platform)) {
          app.addRecentDocument(doc.path)
        }

        // Make sure we never exceed 100 recent docs
        this._recentDocs = this._recentDocs.slice(0, 100)

        // Finally, announce the fact that the list of recent documents has
        // changed to whomever it may concern
        this.emit('update')
      },
      /**
       * Clears out the list of recent files
       * @return {Boolean} True if the call succeeded
       */
      clear: () => {
        this._recentDocs = []
        // Clear the application's recent docs menu as well on macOS or Windows
        if ([ 'darwin', 'win32' ].includes(process.platform)) {
          app.clearRecentDocuments()
        }
        // Announce that the list of recent docs has changed
        this.emit('update')
        return true
      },
      /**
       * Retrieve the list of recent documents
       * @return {Array} A list containing all documents in the recent list
       */
      get: () => {
        return JSON.parse(JSON.stringify(this._recentDocs))
      },
      /**
       * Queries the list of recent documents
       * @return {Boolean} Returns true if there is at least one recent document.
       */
      hasDocs: () => { return this._recentDocs.length > 0 },
      /**
       * Registers a callback for the given event
       */
      on: (event, callback) => { return this.on(event, callback) },
      /**
       * Deregisters a callback for the given event
       */
      off: (event, callback) => { return this.off(event, callback) }
    }
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Always returns true
   */
  shutdown () {
    global.log.verbose('Recent documents provider shutting down ...')
    return true
  }
}
