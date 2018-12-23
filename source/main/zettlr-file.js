/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrFile class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the ZettlrFile class, modeling a file on
 *                  disk for the app.
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')
const sanitize = require('sanitize-filename')
const { shell } = require('electron')
const { hash, ignoreFile, makeImgPathsAbsolute } = require('../common/zettlr-helpers.js')
const { trans } = require('../common/lang/i18n.js')

/**
 * Error Object
 * @param       {String} msg The error message
 * @constructor
 */
function FileError (msg) {
  this.name = 'File error'
  this.msg = msg
}

/**
 * Model for accessing files on the filesystem. This class is also capable of
 * keeping autosave files and reverting to certain states.
 */
class ZettlrFile {
  /**
    * Create the model by reading the file on disk.
    * @param {ZettlrDir} parent       The containing directory model
    * @param {String} fname        The full path to the file to be read
    */
  constructor (parent, fname) {
    this.parent = parent
    this.dir = this.parent.name // Containing dir
    this.path = fname
    this.name = path.basename(this.path)
    this.hash = hash(this.path)
    this.ext = path.extname(this.path)
    this.id = '' // The ID, if there is one inside the file.
    this.tags = [] // All tags that are to be found inside the file's contents.
    this.type = 'file'
    this.modtime = 0
    this.linefeed = '\n'
    // This variable is only used to transfer the file contents to and from
    // the renderer. It will be empty all other times, because otherwise the
    // RAM will fill up pretty fast.
    this.content = ''
    this._vd = [] // This array holds all virtual directories in which the file is also present. Necessary to inform them of renames etc.

    // The file might've been just created. Test that
    try {
      fs.lstatSync(this.path)
    } catch (e) {
      // Error? -> create
      fs.writeFileSync(this.path, '', { encoding: 'utf8' })
    }

    this.read()

    if (this.isRoot()) {
      // We have to add our file to the watchdog
      global.watchdog.addPath(this.path)
    }
  }

  /**
    * This function is always called when the app closes. It can be used to
    * perform closing activity.
    * @return {void} Does not return anything.
    */
  shutdown () {
    // Such empty
  }

  /**
    * Handles an event emitted by the watchdog
    * @param  {String} p The path to test against
    * @param  {String} e The event to handle
    * @return {Boolean} True, if the file has been changed, or false.
    */
  handleEvent (p, e) {
    if (this.isScope(p) === this && this.hasChanged()) {
      // Only in this case may we handle the event. Possible events:
      // change, unlink
      if (e === 'change') {
        this.update().parent.notifyChange(trans('system.file_changed', this.name))
        return true
      } else if (e === 'unlink') {
        this.parent.notifyChange(trans('system.file_removed', this.name))
        this.remove()
        return true
      }
    }

    // Nothing has changed.
    return false
  }

  /**
    * Reads the file and returns its contents. Does not keep the contents in
    * buffer (saving memory)
    * @return {String} The file contents as string.
    */
  read (options = {}) {
    let stat = fs.lstatSync(this.path)
    this.modtime = stat.mtime.getTime()

    // We cannot use RegEx, as negative lookbehind is not supported (yet,
    // so we have to do it the ugly way: ITERATE OVER THE TEXT!)
    //
    // For further reference (as soon as it gets implemented; the proposal
    // is from March 21, 2018 (lel), here the correct regex needed:)
    // let idRE = /(?<!\[\[)@ID:(.*)(?!\]\])/g
    let idStr = global.config.get('zkn.idRE')
    // Make sure the ID definitely has at least one capturing group to not produce
    // errors.
    if (!/\(.+?\)/.test(idStr)) {
      idStr = `(${idStr})`
    }
    let idRE = new RegExp(idStr, 'g') // /@ID:([^\s]*)/g
    let linkStart = global.config.get('zkn.linkStart')
    let linkEnd = global.config.get('zkn.linkEnd')
    let tagRE = /(?<!\\)#(#?[A-Z0-9-_]+#?)/gi // Negative lookbehind to exclude escaped tags
    let match
    // (Re-)read content of file
    let cnt = fs.readFileSync(this.path, { encoding: 'utf8' })

    // Determine linefeed to preserve on saving so that version control
    // systems don't complain.
    if (/\r\n/.test(cnt)) {
      this.linefeed = '\r\n'
    } else if (/\n\r/.test(cnt)) {
      this.linefeed = '\n\r'
    }

    // Iterate over options to do something to the contents.
    if (options.hasOwnProperty('absoluteImagePaths') && options.absoluteImagePaths === true) {
      // We should convert all image paths to absolute.
      cnt = makeImgPathsAbsolute(path.dirname(this.path), cnt)
    }

    // Makes footnotes unique by prefixing them with this file's hash (which is unique)
    // Pandoc will make sure the footnotes are numbered correctly.
    if (options.hasOwnProperty('uniqueFootnotes') && options.uniqueFootnotes === true) {
      cnt = cnt.replace(/\[\^([\w]+?)\]/gm, (match, p1, offset, string) => `[^${String(this.hash)}${p1}]`)
    }

    // Now read all tags
    this.tags = []
    while ((match = tagRE.exec(cnt)) != null) {
      let tag = match[1]
      tag = tag.replace(/#/g, '') // Prevent headings levels 2-6 from showing up in the tag list
      if (tag.length > 0) {
        this.tags.push(match[1].toLowerCase())
      }
    }
    // Remove duplicates
    this.tags = [...new Set(this.tags)]

    // Report the tags to the global database
    if (global.tags && global.tags.hasOwnProperty('report') && this.tags.length > 0) global.tags.report(this.tags)

    // Search for an ID
    this.id = ''

    // Assume an ID in the file name (takes precedence over IDs in the file's
    // content)
    if ((match = idRE.exec(this.name)) != null) {
      this.id = match[1] || ''
      return cnt
    } else if ((match = idRE.exec(cnt)) == null) {
      // No ID found in the content either
      return cnt
    }

    do {
      if (cnt.substr(match.index - linkStart.length, linkStart.length) !== linkStart) {
        // Found the first ID. Precedence should go to the first found.
        // Minor BUG: Takes IDs that are inside links but not literally make up for a link.
        break
      }
    } while ((match = idRE.exec(cnt)) != null)

    if ((match != null) && (match[1].substr(-(linkEnd.length)) !== linkEnd)) {
      this.id = match[1] || ''
    }

    return cnt
  }

  /**
    * Update the parameters of the model based on the file on disk.
    * @return {ZettlrFile} Return this for chainability
    */
  update () {
    // The file has changed remotely -> re-read
    this.read()

    return this
  }

  /**
    * Returns the file content if hashes match
    * @param  {Integer} hash The file hash
    * @return {Mixed}      Either the file's contents or null
    */
  get (hash) {
    if (this.hash === parseInt(hash)) {
      return this.read()
    }
    return null
  }

  /**
    * The object should return itself with content included. Does not keep it in buffer!
    * @return {ZettlrFile} A clone of this with content.
    */
  withContent () {
    // We need to duplicate the file object, because otherwise the content
    // will remain in the RAM. If you open a lot files during one session
    // with Zettlr it will gradually fill up all space, rendering your
    // computer more and more slow.
    return {
      'dir': this.dir, // Containing dir
      'name': this.name,
      'path': this.path,
      'hash': this.hash,
      'id': this.id, // The ID, if there is one inside the file.
      'type': this.type,
      'ext': this.ext,
      'modtime': this.modtime,
      'content': this.read() // Will only be not empty when the file is modified.
    }
  }

  /**
    * Returns this or null based on whether this is the correct file.
    * @param  {object} obj The object containing a hash or a path
    * @return {Mixed}     this or null
    */
  findFile (obj) {
    let prop = ''

    if (obj.hasOwnProperty('path') && obj.path != null) {
      prop = 'path'
    } else if (obj.hasOwnProperty('hash') && obj.hash != null) {
      prop = 'hash'
    } else {
      throw new FileError('Cannot findFile!')
    }

    if (this[prop] === obj[prop]) {
      return this
    }

    // This is not the file you are looking for.
    return null
  }

  /**
    * Either returns this, if the ID matches the term, or null
    * @param  {String} term The ID-term to be searched for
    * @return {ZettlrFile}      This or null.
    */
  findExact (term) {
    let name = this.name.substr(0, this.name.length - this.ext.length)
    let titleFound = (name.toLowerCase() === term.toLowerCase())

    // Return ID exact match or title exact match. Or null, if nothing found.
    return (String(this.id) === String(term)) ? this : (titleFound) ? this : null
  }

  /**
    * Writes the buffer to the file and clears the buffer.
    * @return {ZettlrFile} this
    */
  save (cnt) {
    // Replace CodeMirror \n linefeeds with detected one
    if (this.linefeed !== '\n') {
      cnt = cnt.split('\n').join(this.linefeed)
    }
    fs.writeFileSync(this.path, cnt, { encoding: 'utf8' })

    // Last but not least: Retrieve all changed information by re-reading
    // the file again.
    this.read()

    return this
  }

  /**
    * Removes the file from disk and also from containing dir.
    * @param {Boolean} force Should the model also move the file to the trash?
    * @return {Boolean} The return value of the remove operation on parent
    */
  remove (force = false) {
    if (force) shell.moveItemToTrash(this.path)
    // Notify the virtual directories that this file is now in the trash
    // (also a virtual directory, but not quite the same).
    this.removeFromVD()
    return this.parent.remove(this)
  }

  /**
    * Renames the file on disk
    * @param  {string} name The new name (not path!)
    * @return {ZettlrFile}      this for chainability.
    */
  rename (name) {
    name = sanitize(name, { replacement: '-' })

    // Rename this file.
    if ((name == null) || (name === '')) {
      throw new FileError('The new name did not contain any allowed characters.')
    }

    // Make sure we got an extension.
    if (ignoreFile(name)) {
      name += '.md'
    }

    // Rename
    this.name = name
    let newpath = path.join(path.dirname(this.path), this.name)

    global.watchdog.ignoreNext('unlink', this.path)
    global.watchdog.ignoreNext('add', newpath)
    fs.renameSync(this.path, newpath)
    this.path = newpath
    this.hash = hash(this.path)

    // Let the parent sort itself again to reflect possible changes in order.
    this.parent.sort()

    // Notify virtualDirectories of the path change.
    this._notifyVD()

    // Chainability
    return this
  }

  /**
    * Move a file to another directory
    * @param  {String} toPath The new directory's path
    * @return {ZettlrFile}        this for chainability.
    */
  move (toPath) {
    // First detach the object.
    this.detach()

    // Find new path:
    let oldPath = this.path
    this.path = path.join(toPath, this.name)
    this.hash = hash(this.path)

    // Move
    fs.renameSync(oldPath, this.path)

    // Notify virtualDirectories of the path change.
    this._notifyVD()

    // Chainability
    return this
  }

  /**
    * Detach this object from its containing directory.
    * @return {ZettlrFile} this for chainability
    */
  detach () {
    this.parent.remove(this)
    this.parent = null
    return this
  }

  /**
    * Add a virtual directory to the list of virtual directories
    * @param {ZettlrVirtualDirectory} vd The directory to be added
    */
  addVD (vd) {
    // Prevent duplicates
    if (!this._vd.includes(vd)) {
      this._vd.push(vd)
    }
  }

  /**
    * This function notifies all virtual directories, of which this file is a
    * member, that something has changed and they should update themselves.
    */
  _notifyVD () {
    for (let vd of this._vd) {
      vd.update() // Call update method
    }
  }

  /**
    * Remove a virtual directory to the list of virtual directories
    * @param {ZettlrVirtualDirectory} vd The directory to be removed
    */
  removeVD (vd) {
    if (this._vd.includes(vd)) {
      this._vd.splice(this._vd.indexOf(vd), 1)
    }
  }

  /**
    * Notifies all virtual directories that they can now remove this file.
    */
  removeFromVD () {
    for (let vd of this._vd) {
      vd.remove(this)
    }
  }

  /**
    * Search the file's content and name according to the terms-object
    * @param  {object} terms An object containing the search terms and properties
    * @return {Boolean}       true if this file matches terms or false
    */
  search (terms) {
    let matches = 0

    // First match the title and tags (faster results)
    for (let t of terms) {
      if (t.operator === 'AND') {
        if (this.name.indexOf(t.word) > -1 || this.tags.includes(t.word)) {
          matches++
        }
      } else {
        // OR operator
        for (let wd of t.word) {
          if (this.name.indexOf(wd) > -1 || this.tags.includes(wd)) {
            matches++
            // Break because only one match necessary
            break
          }
        }
      }
    }

    // Return immediately with an object of line -1 (indicating filename or tag matches) and a huge weight
    if (matches === terms.length) { return [{ line: -1, restext: this.name, 'weight': 2 }] }

    // Do a full text search.
    let cnt = this.read()
    let cntLower = cnt.toLowerCase()

    let lines = cnt.split('\n')
    let linesLower = cntLower.split('\n')
    matches = []

    for (let t of terms) {
      if (t.operator === 'AND') {
        for (let index in lines) {
          // Try both normal and lowercase
          if (lines[index].indexOf(t.word) > -1) {
            matches.push({
              'term': t.word,
              'from': {
                'line': parseInt(index),
                'ch': lines[index].indexOf(t.word)
              },
              'to': {
                'line': parseInt(index),
                'ch': lines[index].indexOf(t.word) + t.word.length
              },
              'weight': 1 // Weight indicates that this was an exact match
            })
          } else if (linesLower[index].indexOf(t.word) > -1) {
            matches.push({
              'term': t.word,
              'from': {
                'line': parseInt(index),
                'ch': linesLower[index].indexOf(t.word)
              },
              'to': {
                'line': parseInt(index),
                'ch': linesLower[index].indexOf(t.word) + t.word.length
              },
              'weight': 0.5 // Weight indicates that this was an approximate match
            })
          }
        }
      } else {
        // OR operator.
        for (let wd of t.word) {
          let br = false
          for (let index in lines) {
            // Try both normal and lowercase
            if (lines[index].indexOf(wd) > -1) {
              matches.push({
                'term': wd,
                'from': {
                  'line': parseInt(index),
                  'ch': lines[index].indexOf(wd)
                },
                'to': {
                  'line': parseInt(index),
                  'ch': lines[index].indexOf(wd) + wd.length
                },
                'weight': 1 // Weight indicates that this was an exact match
              })
              br = true
            } else if (linesLower[index].indexOf(wd) > -1) {
              matches.push({
                'term': wd,
                'from': {
                  'line': parseInt(index),
                  'ch': linesLower[index].indexOf(wd)
                },
                'to': {
                  'line': parseInt(index),
                  'ch': linesLower[index].indexOf(wd) + wd.length
                },
                'weight': 1 // Weight indicates that this was an exact match
              })
              br = true
            }
          }
          if (br) break
        }
      }
    }

    return matches
  }

  /**
   * Returns the file's metadata
   * @return {Object} An object containing only the metadata fields
   */
  getMetadata (parent = true) {
    return {
      'parent': (this.isRoot()) ? null : (parent) ? this.parent.getMetadata(false) : null,
      'dir': this.dir,
      'path': this.path,
      'name': this.name,
      'hash': this.hash,
      'ext': this.ext,
      'id': this.id,
      'tags': JSON.parse(JSON.stringify(this.tags)), // Simple copy
      'type': this.type,
      'modtime': this.modtime,
      'linefeed': this.linefeed
    }
  }

  /**
    * Returns the hash of the file
    * @return {Number} The hash
    */
  getHash () { return this.hash }

  /**
    * Returns the file path
    * @return {String} The path
    */
  getPath () { return this.path }

  /**
    * Returns the file name
    * @return {String} The file name
    */
  getName () { return this.name }

  // Dummy functions (either for recursive use or because their return val is obvious)

  /**
    * Dummy function for recursive use. Always returns false.
    * @return {Boolean} Always returns false.
    */
  isDirectory () { return false }

  /**
    * Dummy function for recursive use. Always returns false.
    * @return {Boolean} Returns false.
    */
  isVirtualDirectory () { return false }

  /**
    * Dummy function for recursive use. Always returns true.
    * @return {Boolean} Always returns true.
    */
  isFile () { return true }

  /**
    * Dummy function for recursive use. Always returns false.
    * @param  {Mixed} obj Either ZettlrFile or ZettlrDir
    * @return {Boolean}     Always return false, because a file cannot contain another.
    */
  contains (obj) { return false }

  /**
    * Dummy function for recursive use. Always returns null.
    * @param  {Mixed} obj Either ZettlrFile or ZettlrDir
    * @return {null}     Always return null.
    */
  findDir (obj) { return null }

  /**
    * Returns false, if this.parent is a directory.
    * @return {Boolean} True or false depending on the type of this.parent
    */
  isRoot () { return !this.parent.isDirectory() }

  /**
    * Checks whether or not the given path p is in the scope of this object
    * @param  {String}  p The path to test
    * @return {Mixed}   "this" if p equals path, false otherwise.
    */
  isScope (p) {
    if (p === this.path) {
      return this
    }

    return false
  }

  /**
    * This function returns true, if the modtime of the file is different than
    * the last one that has been recorded (after the last save of the file).
    * @return {Boolean} True, if the file has changed since last check, or false.
    */
  hasChanged () {
    try {
      let stat = fs.lstatSync(this.path)
      return (stat.mtime.getTime() !== this.modtime)
    } catch (e) {
      // An error occurred, which means the file seems to have been deleted
      // in the meantime. We won't handle this case here, but indeed the
      // file must've been changed.
      return true
    }
  }
}

module.exports = ZettlrFile
