/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDeadDir class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a class that is used for directories
 *                  found in the paths that could not be located. It mocks the
 *                  API of a standard dir and serves as a placeholder until the
 *                  directory has been re-attached.
 *
 * END HEADER
 */

const path = require('path')

// Include helpers
const hash = require('../common/util/hash')

/**
 * This class models properties and features of a directory on disk.
 */
class ZettlrDeadDir {
  /**
    * Read a directory.
    * @param {Mixed} parent     Either ZettlrDir or Zettlr, depending on root status.
    * @param {String} dir      The full path to the directory
    */
  constructor (parent, dir) {
    if (dir === null || dir === '') {
      throw new Error('Error on ZettlrDir instantiation: dir cannot be empty!')
    }

    // Prepopulate
    this.parent = parent
    this.path = dir
    this.name = path.basename(this.path)
    this.hash = hash(this.path)
    this.project = null // null, if this directory is not a project, and an instance of ZettlrProject, if it is.
    this.children = []
    this.attachments = []
    this.type = 'dead-directory'
    this.sorting = 'name-up'
  }

  /**
    * Initiates a shutdown to all children
    */
  shutdown () {
    // Nothing to do
  }

  /**
    * Handles an event sent fron the watchdog
    * @param  {String} p The path for which the event was thrown
    * @param  {String} e The event itself
    * @return {Boolean}   Whether the event actually caused a change.
    */
  handleEvent (p, e) {
    // If this part is executed, nothing has changed.
    return false
  }

  /**
    * Notifies the parent (a dir or Zettlr) to send a notification + paths-update.
    * @param  {String} msg The message to be sent.
    */
  notifyChange (msg) { this.parent.notifyChange(msg) }

  /**
    * Takes an object and returns a ZettlrDir-object (or null)
    * @param  {Object} obj An object containing information for search
    * @return {Mixed}     Returns this if the query matches, or null.
    */
  findDir (obj) {
    if (obj.hasOwnProperty('hash') && this.hash === obj.hash) return this
    if (obj.hasOwnProperty('path') && this.path === obj.path) return this
    return null
  }

  /**
    * Finds a file in this directory
    * @param  {Object} obj An object containing information on the file.
    * @return {null}     Always returns null.
    */
  findFile (obj) { return null }

  /**
    * Either returns a file if the match is exact, or null
    * @param  {String} term The ID to be searched for
    * @return {null}      Always returns null.
    */
  findExact (term) { return null }

  /**
    * Returns the contents of a file identified by its hash
    * @param  {Integer} hash The file's hash
    * @return {null}      As this directory does not have children, always null.
    */
  get (hash) { return null }

  /**
    * Removes either a child or this directory.
    * @param  {Mixed} [obj=this] Either ZettlrDir or ZettlrFile
    * @param {Boolean} [force=false] Should the directory itself be deleted as well?
    * @return {Boolean}            Whether or not the operation completed successfully.
    */
  remove (obj = this, force = false) {
    if (obj === this) {
      this.shutdown()
      this.parent.remove(this)
    }

    return true
  }

  /**
    * Detaches this directory from its parent.
    * @return {ZettlrDir} This for chainability.
    */
  detach () {
    this.parent.remove(this)
    this.parent = null
    return this
  }

  /**
    * Scans the directory and adds all children that match the criteria (e.g.
    * dir or file permitted by filetypes)
    * @return {Promise} Resolve on successful loading
    */
  async scan () { /* Doesn't do anything, as the directory doesn't exist */ }

  /**
    * Returns true, if the given path exists somewhere in this dir.
    * @param  {String} p An absolute path.
    * @return {Boolean}   True (if the path exists) or false.
    */
  exists (p) {
    // return true if path exists
    if (this.path === p) return true
    return false
  }

  /**
    * Check whether or not this dir contains the given object (dir or file)
    * @param  {Object} obj An object containing a hash.
    * @return {Boolean}     Always returns false
    */
  contains (obj) { return false }

  /**
    * Has this dir a direct child with the given property?
    * @param  {Object}  obj An object containing a path, name or hash
    * @return {Boolean}     Always returns false.
    */
  hasChild (obj) { return false }

  /**
   * Returns the directory's metadata
   * @return {Object} An object containing only the metadata fields
   */
  getMetadata (children = true) {
    return {
      'parent': (this.isRoot()) ? null : this.parent.getMetadata(false),
      'path': this.path,
      'name': this.name,
      'hash': this.hash,
      'project': null,
      'children': [],
      'attachments': [],
      'type': this.type,
      'sorting': this.sorting
    }
  }

  /**
    * Returns the hash of the dir
    * @return {Number} The hash
    */
  getHash () { return this.hash }

  /**
    * Returns the directory path
    * @return {String} The path
    */
  getPath () { return this.path }

  /**
    * Returns the directory name
    * @return {String} The dir name
    */
  getName () { return this.name }

  /**
    * Dummy function for recursive use. Always returns true.
    * @return {Boolean} Returns true, because this is a directory.
    */
  isDirectory () { return true }

  /**
    * Dummy function for recursive use. Always returns false.
    * @return {Boolean} Returns false.
    */
  isVirtualDirectory () { return false }

  /**
    * Dummy function for recursive use. Always returns false.
    * @return {Boolean} Returns false, because this is not a file.
    */
  isFile () { return false }

  /**
    * Returns false, if this.parent is a directory.
    * @return {Boolean} True or false depending on the type of this.parent
    */
  isRoot () { return !this.parent.isDirectory() }

  /**
    * Checks whether or not the given path p is in the scope of this object
    * @param  {String}  p The path to test
    * @return {Mixed}   "this" if p equals path, true if in scope or false.
    */
  isScope (p) {
    if (p === this.path) {
      return this
    } else if (p.indexOf(this.path) !== -1) {
      return true
    }

    return false
  }
}

module.exports = ZettlrDeadDir
