/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GettlrAlias
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This represents a symbolic link, either a "real" one that
 *                  resides on the file system or a virtual directory file.
 *
 * END HEADER
 */

const path = require('path')
const hash = require('../common/util/hash')

class GettlrAlias {
  constructor (parent, name, relativePath) {
    this.parent = parent
    // The alias is always references relative to the parent VD's directory path.
    this._alias = hash(path.resolve(this.parent.getRootPath(), relativePath))
    this.type = 'file' // Mock a file in this respect.
    this.name = name
    this.path = path.join(this.parent.path, this.name)
    this.hash = hash(this.path)
  }

  /**
   * FUNCTIONS THAT SHOULD RETURN REFERENCES TO THIS ALIAS
   */

  _applyMetadata (obj = null) {
    // If we haven't found the file make sure we at least return a skeleton
    if (!obj) {
      obj = {
        'parent': null,
        'dir': this.dir,
        'path': this.path,
        'name': this.name,
        'hash': this.hash,
        'ext': '',
        'id': '',
        'tags': [], // Simple copy
        'type': 'file',
        'wordCount': 0,
        'charCount': 0,
        'target': null,
        'modtime': 0,
        'creationtime': 0
      }
    }

    obj.isAlias = true // Add a small indication that this is actually an alias
    obj.hash = this.hash // For file operations we need the hash, so provide it.
    obj.name = this.name // Also, indicate the name.
    return obj
  }

  /**
   * Removes the alias.
   * @param  {Boolean} [force=false] omitted force flag.
   * @return {Boolean}                The success or failure of the removal.
   */
  remove (force = false) { return this.parent.remove(this) }

  /**
   * Renames the alias.
   * @param  {String} name The new name.
   * @return {GettlrAlias}      this.
   */
  rename (name) {
    let oldname = this.name
    this.name = name
    this.parent.renameFile(oldname, this.name)
    return this
  }

  getAlias () { return this._alias }

  /**
   * FUNCTIONS THAT SHOULD RETURN REFERENCES TO THE ALIASED FILE
   */

  getMetadata () {
    let file = global.application.findFile(this._alias)
    if (!file) return this._applyMetadata() // Return a fake-object because we could not find the file.

    let metadata = file.getMetadata(false) // Never include its parent
    metadata = this._applyMetadata(metadata) // Overwrite some properties

    return metadata
  }

  /**
   * Returns the findFile property of the aliased file OR of the alias.
   * @param  {Object} obj An object with search parameters.
   * @return {Mixed}     Either null or the result of findFile
   */
  findFile (obj) {
    if (!obj.hasOwnProperty('hash') && !obj.hasOwnProperty('path')) return null
    // TODO: This function does NOT find the alias of this file. Oh gosh.
    // First check, if the alias itself has been searched for. If so,
    // return this, as any other function can then be looped through
    // to the target file.
    if (obj.hasOwnProperty('hash') && obj.hash === this.hash) return this
    if (obj.hasOwnProperty('path') && obj.path === this.path) return this

    // Now check if we're responsible for finding the hash?
    // if (obj.hash !== this._alias) return null

    // Make sure we don't run into an endless loop with the recursive search!
    // This is meant for when the referenced file comes AFTER the alias in the
    // file tree. As we run a full search through the tree *again*, if the
    // alias is responsible, we need to make sure that the second time, this
    // SPECIFIC alias is called it does return null so that the "correct"
    // file can be returned.
    if (obj.hasOwnProperty('visited') && obj.visited.includes(this.hash)) return null
    if (!obj.hasOwnProperty('visited')) obj.visited = [this.hash]
    if (!obj.visited.includes(this.hash)) obj.visited.push(this.hash)

    // Not the alias, so let's find the file itself. ATTENTION: We need to
    // search with the ORIGINAL object as this contains the "visited" prop
    // we need to double-check whether or not we've been here.
    let file = global.application.findFile(obj)
    if (!file) return null
    return file
  }

  /**
    * Either returns this, if the ID matches the term, or null
    * @param  {String} term The ID-term to be searched for
    * @return {GettlrFile}      This or null.
    */
  findExact (term) {
    let file = global.application.findFile({ 'hash': this._alias })
    if (!file) return null

    return file.findExact(term)
  }

  /**
    * Search the file's content and name according to the terms-object
    * @param  {object} terms An object containing the search terms and properties
    * @return {Array}       An array containing all search results
    */
  search (terms) {
    let file = global.application.findFile({ 'hash': this._alias })
    if (!file) return []
    let res = file.search(terms)

    return res
  }

  /**
   * Retrieves the content of the aliased file.
   * @param  {Number} hash The hash to search for.
   * @return {Mixed}      The file contents (string) or null.
   */
  get (hash) {
    let file = global.application.findFile(this._alias)
    if (!file) return null

    return file.get(hash)
  }

  /**
   * Retrieves the content of the aliased file.
   * @return {Object} Metadata with content.
   */
  withContent () {
    let file = global.application.findFile(this._alias)
    if (!file) return null

    let metadata = file.withContent()
    metadata = this._applyMetadata(metadata) // Overwrite some properties

    return metadata
  }

  /**
   * Reads in the target file.
   * @param  {Object} opt Optional options.
   * @return {String}     The file's contents.
   */
  read (opt) {
    let file = global.application.findFile(this._alias)
    if (!file) return null

    return file.read(opt)
  }

  /**
   * Saves the content to the original file.
   * @param  {String} cnt The new content
   * @return {GettlrAlias}     This.
   */
  save (cnt) {
    let file = global.application.findFile(this._alias)
    if (!file) return null
    file.save(cnt)

    return this
  }

  /**
   * Aliases are never root, so it always returns false.
   * @return {Boolean} Always false.
   */
  isRoot () { return false }

  /**
   * Yup, this file is an alias.
   * @return {Boolean} True, as this is an alias.
   */
  isAlias () { return true }
}

module.exports = GettlrAlias
