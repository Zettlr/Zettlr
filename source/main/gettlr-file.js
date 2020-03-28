/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GettlrFile class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the GettlrFile class, modeling a file on
 *                  disk for the app.
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')
const sanitize = require('sanitize-filename')
const { shell } = require('electron')
const hash = require('../common/util/hash')
const ignoreFile = require('../common/util/ignore-file')
const makeImgPathsAbsolute = require('../common/util/make-img-paths-absolute')
const countWords = require('../common/util/count-words')
const { trans } = require('../common/lang/i18n')
const extractYamlFrontmatter = require('../common/util/extract-yaml-frontmatter')

// This is a list of all possible Pandoc Frontmatter
// variables that Gettlr may make use of
const FRONTMATTER_VARS = [
  'title',
  'subtitle',
  'author',
  'date',
  'keywords',
  'lang'
]

/**
 * Model for accessing files on the filesystem. This class is also capable of
 * keeping autosave files and reverting to certain states.
 */
class GettlrFile {
  /**
    * Create the model by reading the file on disk.
    * @param {GettlrDir} parent       The containing directory model
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
    this.wordCount = 0
    this.charCount = 0
    this.target = null // Contains the target object
    this.modtime = 0 // Modification time
    this.creationtime = 0 // Creation time
    this.linefeed = '\n'
    this.frontmatter = {} // May contain frontmatter variables
    // This variable is only used to transfer the file contents to and from
    // the renderer. It will be empty all other times, because otherwise the
    // RAM will fill up pretty fast.
    this.content = ''

    // The file might've been just created. Test that
    try {
      fs.lstatSync(this.path)
    } catch (e) {
      // Error? -> create
      fs.writeFileSync(this.path, '', { encoding: 'utf8' })
    }

    // We have to add our file to the watchdog
    if (this.isRoot()) global.watchdog.addPath(this.path)

    this._boundOnUnlink = this.onUnlink.bind(this)
    this._boundOnChange = this.onChange.bind(this)

    // Listen to certain events from the watchdog
    global.watchdog.on('unlink', this._boundOnUnlink)
    global.watchdog.on('change', this._boundOnChange)

    // Last but not least check if there's a writing target and listen for
    // change events.
    this.target = global.targets.get(this.hash)
    global.targets.on('update', (hash) => {
      if (this.hash !== hash) return // Not our business
      // Simply pull in the new target
      this.target = global.targets.get(this.hash)
      // Send a fresh version of this file to the renderer.
      global.application.fileUpdate(this.hash, this.getMetadata())
    })
    global.targets.on('remove', (hash) => {
      if (this.hash !== hash) return // Also not our business
      this.target = null // Reset
      // Send a fresh version of this file to the renderer.
      global.application.fileUpdate(this.hash, this.getMetadata())
    })
  }

  /**
    * This function is always called when the app closes. It can be used to
    * perform closing activity.
    * @return {void} Does not return anything.
    */
  shutdown () {
    // Remove the listeners
    global.watchdog.off('unlink', this._boundOnUnlink)
    global.watchdog.off('change', this._boundOnChange)
  }

  onUnlink (p) {
    if (this.isScope(p) !== this) return
    global.application.notifyChange(trans('system.file_removed', this.name))
    this.remove()
  }

  onChange (p) {
    if (this.isScope(p) !== this) return
    if (!this.hasChanged()) return
    this.update()
    global.ipc.notify(trans('system.file_changed', this.name))
    global.application.fileUpdate(this.getMetadata())
  }

  /**
    * Reads the file and returns its contents. Does not keep the contents in
    * buffer (saving memory)
    * @return {String} The file contents as string.
    */
  read (options = {}) {
    let stat = fs.lstatSync(this.path)
    this.modtime = stat.mtime.getTime()
    this.creationtime = stat.birthtime.getTime()

    // (Re-)read content of file
    let cnt = fs.readFileSync(this.path, { encoding: 'utf8' })

    return this._parseFileContents(options, cnt)
  }

  /**
   * Asynchronously scans the file's contents to not interrupt loading of the app.
   * @return {void} Does not return.
   */
  async scan () {
    let stat = fs.lstatSync(this.path)
    this.modtime = stat.mtime.getTime()
    this.creationtime = stat.birthtime.getTime()

    return new Promise((resolve, reject) => {
      fs.readFile(this.path, { encoding: 'utf8' }, (err, content) => {
        if (err) reject(err)
        this._parseFileContents({}, content)
        resolve()
      })
    })
  }

  /**
   * Parses the file's contents and saves the results to the internal variables.
   * @param  {Object} options Optional options (such as to revert the image paths to absolute)
   * @param  {String} cnt     The file's content
   * @return {String}         The file's content, potentially altered.
   */
  _parseFileContents (options, cnt) {
    // Get the ID regex from the config
    let idStr = global.config.get('zkn.idRE')
    // Make sure the ID definitely has at least one capturing group to not produce
    // errors.
    if (!/\(.+?\)/.test(idStr)) idStr = `(${idStr})`

    let idRE = new RegExp(idStr, 'g')
    let linkStart = global.config.get('zkn.linkStart')
    let linkEnd = global.config.get('zkn.linkEnd')
    // To detect tags in accordance with what the engine will render as tags,
    // we need to exclude everything that is not preceded by either a newline
    // or a space.
    // Positive lookbehind: Assert either a space, a newline or the start of the
    // string.
    let tagRE = /(?<= |\n|^)#(#?[^\s,.:;…!?"'`»«“”‘’—–@$%&*^+~÷\\/|<=>[\](){}]+#?)/g
    let match
    // Get the word and character count
    this.wordCount = countWords(cnt)
    this.charCount = cnt.length

    // Extract a potential YAML frontmatter
    let frontmatter = extractYamlFrontmatter(cnt)
    this.frontmatter = {} // Reset
    if (frontmatter) {
      // Here are all supported variables for Pandoc:
      // https://pandoc.org/MANUAL.html#variables
      for (let [ key, value ] of Object.entries(frontmatter)) {
        if (FRONTMATTER_VARS.includes(key)) {
          this.frontmatter[key] = value
        }
      }
    }

    // Create a copy of the code without any code blocks and inline
    // code for the tag and ID extraction methods.
    let mdWithoutCode = cnt.replace(/`{1,3}[^`]+`{1,3}/g, '')

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

    // Remove the current tags from the database. The new tags will be reported
    // later on.
    if (this.tags.length > 0) global.tags.remove(this.tags)

    // Now read all tags
    this.tags = []
    while ((match = tagRE.exec(mdWithoutCode)) != null) {
      let tag = match[1]
      tag = tag.replace(/#/g, '') // Prevent headings levels 2-6 from showing up in the tag list
      if (tag.length > 0) this.tags.push(match[1].toLowerCase())
    }

    // Merge possible keywords from the frontmatter
    if (this.frontmatter.hasOwnProperty('keywords')) {
      this.tags = this.tags.concat(this.frontmatter.keywords)
    }

    // Remove duplicates
    this.tags = [...new Set(this.tags)]

    // Report the tags to the global database
    if (this.tags.length > 0) global.tags.report(this.tags)

    // Search for an ID
    this.id = ''

    // Assume an ID in the file name (takes precedence over IDs in the file's
    // content)
    if ((match = idRE.exec(this.name)) != null) {
      this.id = match[1] || ''
      return cnt
    } else if ((match = idRE.exec(mdWithoutCode)) == null) {
      // No ID found in the content either
      return cnt
    }

    do {
      if (mdWithoutCode.substr(match.index - linkStart.length, linkStart.length) !== linkStart) {
        // Found the first ID. Precedence should go to the first found.
        // Minor BUG: Takes IDs that are inside links but not literally make up for a link.
        break
      }
    } while ((match = idRE.exec(mdWithoutCode)) != null)

    if ((match != null) && (match[1].substr(-(linkEnd.length)) !== linkEnd)) {
      this.id = match[1] || ''
    }

    return cnt
  }

  /**
    * Update the parameters of the model based on the file on disk.
    * @return {GettlrFile} Return this for chainability
    */
  update () {
    // The file has changed remotely -> re-read
    this.scan()

    return this
  }

  /**
    * Returns the file content if hashes match
    * @param  {Integer} hash The file hash
    * @return {Mixed}      Either the file's contents or null
    */
  get (hash) {
    if (this.hash === parseInt(hash)) return this.read()
    return null
  }

  /**
    * The object should return itself with content included. Does not keep it in buffer!
    * @return {GettlrFile} A clone of this with content.
    */
  withContent () {
    // We need to duplicate the file object, because otherwise the content
    // will remain in the RAM. If you open a lot files during one session
    // with Gettlr it will gradually fill up all space, rendering your
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
      'creationtime': this.creationtime,
      'frontmatter': this.frontmatter,
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
    }

    if (!prop) return null

    if (this[prop] === obj[prop]) return this

    // This is not the file you are looking for.
    return null
  }

  /**
    * Either returns this, if the ID matches the term, or null
    * @param  {String} term The ID-term to be searched for
    * @return {GettlrFile}      This or null.
    */
  findExact (term) {
    // Make sure the term indeed is a string
    if (!term || typeof term !== 'string') return null

    let name = this.name.substr(0, this.name.length - this.ext.length)
    let titleFound = (name.toLowerCase() === term.toLowerCase())

    // Return ID exact match or title exact match. Or null, if nothing found.
    return (String(this.id) === String(term)) ? this : (titleFound) ? this : null
  }

  /**
    * Writes the buffer to the file and clears the buffer.
    * @return {GettlrFile} this
    */
  save (cnt) {
    // Replace CodeMirror \n linefeeds with detected one
    if (this.linefeed !== '\n') cnt = cnt.split('\n').join(this.linefeed)

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
    this.shutdown()
    if (force) shell.moveItemToTrash(this.path)
    return this.parent.remove(this)
  }

  /**
    * Renames the file on disk
    * @param  {string} name The new name (not path!)
    * @return {GettlrFile}      this for chainability.
    */
  rename (name) {
    name = sanitize(name, { replacement: '-' })

    // Rename this file.
    if ((name == null) || (name === '')) {
      throw new Error('The new name did not contain any allowed characters.')
    }

    // Make sure we got an extension.
    if (ignoreFile(name)) name += '.md'

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

    // Chainability
    return this
  }

  /**
    * Move a file to another directory
    * @param  {String} toPath The new directory's path
    * @return {Promise} Resolves after a successful move
    */
  async move (toPath) {
    return new Promise((resolve, reject) => {
      // First detach the object.
      this.detach()

      // Find new path:
      let oldPath = this.path
      this.path = path.join(toPath, this.name)
      this.hash = hash(this.path)

      // Move
      fs.rename(oldPath, this.path, (err) => {
        if (err) reject(err)
        resolve()
      })
    })
  }

  /**
    * Detach this object from its containing directory.
    * @return {GettlrFile} this for chainability
    */
  detach () {
    this.parent.remove(this)
    this.parent = null
    return this
  }

  /**
    * Search the file's content and name according to the terms-object
    * @param  {object} terms An object containing the search terms and properties
    * @return {Array}       An array containing all search results
    */
  search (terms) {
    let matches = 0

    // Initialise the content variables (needed to check for NOT operators)
    let cnt = this.read()
    let cntLower = cnt.toLowerCase()

    // Immediately search for not operators
    let notOperators = terms.filter(elem => elem.operator === 'NOT')
    if (notOperators.length > 0) {
      for (let not of notOperators) {
        // NOT is a strict stop indicator, meaning that if
        // one NOT is found in the file, the whole file is
        // disqualified as a candidate.
        if (
          cntLower.indexOf(not.word.toLowerCase()) > -1 ||
          this.name.toLowerCase().indexOf(not.word.toLowerCase()) > -1
        ) {
          return []
        }
      }
    }

    // If we've reached this point, there was no stop. However,
    // it might be, that there are no other terms left, that is:
    // the user wanted to simply *exclude* files. What do we do?
    // Easy, look above: We'll be returning an object to indicate
    // *as if* this file had a filename match.
    if (notOperators.length === terms.length) { return [{ line: -1, restext: this.name, 'weight': 2 }] }

    // Now, pluck the not operators from the terms
    let termsToSearch = terms.filter(elem => elem.operator !== 'NOT')

    // First try to match the title and tags
    for (let t of termsToSearch) {
      if (t.operator === 'AND') {
        if (this.name.toLowerCase().indexOf(t.word.toLowerCase()) > -1 || this.tags.includes(t.word.toLowerCase())) {
          matches++
        } else if (t.word[0] === '#' && this.tags.includes(t.word.substr(1))) {
          // Account for a potential # in front of the tag
          matches++
        }
      } else if (t.operator === 'OR') {
        // OR operator
        for (let wd of t.word) {
          if (this.name.toLowerCase().indexOf(wd.toLowerCase()) > -1 || this.tags.includes(wd.toLowerCase())) {
            matches++
            // Break because only one match necessary
            break
          } else if (wd[0] === '#' && this.tags.includes(wd.toLowerCase().substr(1))) {
            // Account for a potential # in front of the tag
            matches++
            break
          }
        }
      }
    }

    // Return immediately with an object of line -1 (indicating filename or tag matches) and a huge weight
    if (matches === termsToSearch.length) { return [{ line: -1, restext: this.name, 'weight': 2 }] }

    // Reset the matches, now to hold an array
    matches = []

    // Initialise the rest of the necessary variables
    let lines = cnt.split('\n')
    let linesLower = cntLower.split('\n')
    let termsMatched = 0

    for (let t of termsToSearch) {
      let hasTermMatched = false
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
            hasTermMatched = true
          } else if (linesLower[index].indexOf(t.word.toLowerCase()) > -1) {
            matches.push({
              'term': t.word,
              'from': {
                'line': parseInt(index),
                'ch': linesLower[index].indexOf(t.word.toLowerCase())
              },
              'to': {
                'line': parseInt(index),
                'ch': linesLower[index].indexOf(t.word.toLowerCase()) + t.word.length
              },
              'weight': 0.5 // Weight indicates that this was an approximate match
            })
            hasTermMatched = true
          }
        }
        // End AND operator
      } else if (t.operator === 'OR') {
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
              hasTermMatched = true
              br = true
            } else if (linesLower[index].indexOf(wd.toLowerCase()) > -1) {
              matches.push({
                'term': wd,
                'from': {
                  'line': parseInt(index),
                  'ch': linesLower[index].indexOf(wd.toLowerCase())
                },
                'to': {
                  'line': parseInt(index),
                  'ch': linesLower[index].indexOf(wd.toLowerCase()) + wd.length
                },
                'weight': 1 // Weight indicates that this was an exact match
              })
              hasTermMatched = true
              br = true
            }
          }
          if (br) break
        }
      } // End OR operator
      if (hasTermMatched) termsMatched++
    }

    if (termsMatched === termsToSearch.length) return matches
    return [] // Empty array indicating that not all required terms have matched
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
      'wordCount': this.wordCount,
      'charCount': this.charCount,
      'target': this.target,
      'modtime': this.modtime,
      'creationtime': this.creationtime,
      'frontmatter': this.frontmatter,
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
    * @param  {Mixed} obj Either GettlrFile or GettlrDir
    * @return {Boolean}     Always return false, because a file cannot contain another.
    */
  contains (obj) { return false }

  /**
    * Dummy function for recursive use. Always returns null.
    * @param  {Mixed} obj Either GettlrFile or GettlrDir
    * @return {null}     Always return null.
    */
  findDir (obj) { return null }

  /**
    * Returns false, if this.parent is a directory.
    * @return {Boolean} True or false depending on the type of this.parent
    */
  isRoot () { return !this.parent.isDirectory() }

  /**
   * Nope, this file is a real file.
   * @return {Boolean} False, as this is a file.
   */
  isAlias () { return false }

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

module.exports = GettlrFile
