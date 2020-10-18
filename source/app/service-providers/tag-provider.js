/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TagProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles everything tag related that's going on in the app.
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
module.exports = class TagProvider {
  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor () {
    global.log.verbose('Tag provider booting up ...')
    this._file = path.join(require('electron').app.getPath('userData'), 'tags.json')
    this._tags = []
    // The global tag database; it contains all tags that are used in any of the
    // files.
    this._globalTagDatabase = Object.create(null)

    this._load()

    // Register a global helper for the tag database
    global.tags = {
      /**
       * Adds an array of tags to the database
       * @param  {Array} tagArray An array containing the tags to be added
       * @return {void}          Does not return.
       */
      report: (tagArray) => {
        for (let tag of tagArray) {
          // Either init with one or increment the tag counter.
          if (this._globalTagDatabase[tag] === undefined) {
            this._globalTagDatabase[tag] = { 'text': tag, 'count': 1 }
            let cInfo = this._tags.find(e => e.name === tag)
            // Set a special class to all tags that have a highlight colour
            this._globalTagDatabase[tag].className = (cInfo) ? 'cm-hint-colour' : ''
          } else {
            this._globalTagDatabase[tag].count += 1
          }
        }

        // If we're not booting anymore, update the tag database
        if (!global.application.isBooting()) global.ipc.send('tags-database', JSON.parse(JSON.stringify(this._globalTagDatabase)))
      },
      /**
       * Removes the given tagArray from the database, i.e. decreases the
       * counter until zero and then removes the tag.
       * @param  {Array} tagArray The tags to remove from the database
       * @return {void}          Does not return.
       */
      remove: (tagArray) => {
        for (let tag of tagArray) {
          if (this._globalTagDatabase[tag]) this._globalTagDatabase[tag].count--
          // Remove the tag altogether if its count is zero.
          if (this._globalTagDatabase[tag].count <= 0) this._globalTagDatabase[tag] = undefined
        }

        // If we're not booting anymore, update the tag database
        if (!global.application.isBooting()) global.ipc.send('tags-database', JSON.parse(JSON.stringify(this._globalTagDatabase)))
      },
      /**
       * Returns the global tag database
       * @return {Object} An object containing all tags.
       */
      getTagDatabase: () => {
        return JSON.parse(JSON.stringify(this._globalTagDatabase))
      },
      /**
       * Returns the special (= coloured) tags
       * @param  {String} name An optional name to get one. Otherwise, will return all.
       * @return {Array}      The special tag array.
       */
      getSpecialTags: (name) => { return this.get(name) },
      /**
       * Updates the special tags with an array of new ones.
       * @param  {Array} newTags An array containing the tags to be set.
       * @return {Boolean} True if all succeeded, false if at least one failed.
       */
      update: (newTags) => { return this.update(newTags) }
    }
  }

  /**
   * Shuts down the service provider
   * @return {Boolean} Returns true after successful shutdown
   */
  shutdown () {
    global.log.verbose('Tag provider shutting down ...')
    this._save()
    return true
  }

  /**
   * This function only (re-)reads the tags on disk.
   * @return {ZettlrTags} This for chainability.
   */
  _load () {
    // We are not checking if the user directory exists, b/c this file will
    // be loaded after the ZettlrConfig, which makes sure the dir exists.

    // Does the file already exist?
    try {
      fs.lstatSync(this._file)
      this._tags = JSON.parse(fs.readFileSync(this._file, { encoding: 'utf8' }))
    } catch (e) {
      fs.writeFileSync(this._file, JSON.stringify([]), { encoding: 'utf8' })
      return this // No need to iterate over objects anymore
    }

    this._checkIntegrity()

    return this
  }

  /**
   * Simply writes the tag data to disk.
   * @return {ZettlrTags} This for chainability.
   */
  _save () {
    // (Over-)write the tags
    fs.writeFileSync(this._file, JSON.stringify(this._tags), { encoding: 'utf8' })

    return this
  }

  /**
   * This file makes sure all tags fulfill certain criteria
   */
  _checkIntegrity () {
    let nulltag = { 'name': 'NULL', 'color': '#ff0000', 'desc': 'No description given' }
    for (let tag of this._tags) {
      if (typeof tag === 'object') {
        if (!tag.hasOwnProperty('name')) {
          tag.name = nulltag.name
        }
        if (!tag.hasOwnProperty('color')) {
          tag.color = nulltag.color
        }
        if (!tag.hasOwnProperty('desc')) {
          tag.desc = nulltag.desc
        }
        // Make sure descriptions are short
        if (tag.desc.length > 100) {
          tag.desc = tag.desc.substr(0, 100)
        }
      } else {
        // wtf is this? make it go away
        this._tags.splice(this._tags.indexOf(tag), 1)
      }
    }

    // Now remove all tags that fulfill the "not given" template above completely
    for (let tag of this._tags) {
      if (tag === nulltag) {
        this._tags.splice(this._tags.indexOf(tag), 1)
      }
    }

    return this
  }

  /**
   * Returns a tag (or all, if name was not given)
   * @param  {String} [name=null] The tag to be searched for
   * @return {Object}      Either undefined (as returned by Array.find()) or the tag
   */
  get (name = null) {
    if (!name) {
      return this._tags
    }

    return this._tags.find((elem) => { return elem.name === name })
  }

  /**
   * Add or change a given tag. If a tag with "name" exists, it will be overwritten, else added.
   * @param {String} name  The tag name
   * @param {String} color The color, HTML compliant
   * @param {String} desc  A short description.
   */
  set (name, color, desc) {
    let tag = this.get(name)
    // Either overwrite or add
    if (tag) {
      tag = { 'name': name, 'color': color, 'desc': desc }
    } else {
      this._tags.push({ 'name': name, 'color': color, 'desc': desc })
    }

    this._save()

    return this
  }

  /**
   * Updates all tags (i.e. replaces them)
   * @param  {Array} tags The new tags as an array
   * @return {Boolean} Whether or not all tags succeeded.
   */
  update (tags) {
    this._tags = []
    let retVal = true
    for (let t of tags) {
      // Only update correctly set tags
      if (t.hasOwnProperty('name') && t.hasOwnProperty('color') && t.hasOwnProperty('desc')) {
        this.set(t.name, t.color, t.desc)
      } else {
        retVal = false
      }
    }

    this._save()

    return retVal
  }
}
