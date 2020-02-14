/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CSSProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Makes the custom CSS available throughout the app.
 *
 * END HEADER
 */

const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const EventEmitter = require('events')

class CSSProvider extends EventEmitter {
  constructor () {
    super()
    global.log.verbose('CSS provider booting up ...')
    this._filePath = path.join(app.getPath('userData'), 'custom.css')

    // Check for the existence of the custom CSS file. If it is not existent,
    // create an empty one.
    try {
      fs.lstatSync(this._filePath)
    } catch (e) {
      // Create an empty file with a nice initial comment in it.
      fs.writeFileSync(this._filePath, '/* Enter your custom CSS here */\n\n')
    }

    // Inject the global provider functions
    global.css = {
      on: (event, callback) => { this.on(event, callback) },
      off: (event, callback) => { this.on(event, callback) },
      get: () => { return this.get() },
      getPath: () => { return this._filePath },
      set: (newContent) => { return this.set(newContent) }
    }
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  shutdown () {
    global.log.verbose('CSS provider shutting down ...')
    return true
  }

  /**
   * Retrieves the content of the custom CSS file
   * @return {String} The custom CSS
   */
  get () {
    let file = fs.readFileSync(this._filePath, 'utf8')
    return file
  }

  /**
   * The renderer will need this path to dynamically load it in.
   * @return {String} The fully qualified path to the CSS file.
   */
  getPath () { return this._filePath }

  /**
   * Writes new data to the custom CSS file, and returns if the call succeeded.
   * @param {String} newContent The new contents
   * @return {Boolean} Whether or not the call succeeded.
   */
  set (newContent) {
    try {
      fs.writeFileSync(this._filePath, newContent)
      this.emit('update', this._filePath)
      return true
    } catch (e) {
      return false
    }
  }
}

module.exports = new CSSProvider()
