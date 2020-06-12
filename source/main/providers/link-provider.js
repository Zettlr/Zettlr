/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LinkProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Julien Mirval
 * License:         GNU GPL v3
 *
 * Description:     Handles everything link related that's going on in the app.
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')

/**
 * This class manages note's relations on the app. It reads the links on each
 * start of the app and writes them after they have been changed.
 */
class LinkProvider {
  /**
   * Create the instance on program start and initially load the links.
   */
  constructor () {
    global.log.verbose('Link provider booting up ...')
    this._file = path.join(require('electron').app.getPath('userData'), 'links.json')
    this._links = []
    // The global link database; it contains all links that are used in any of the
    // files.
    this._globalLinkDatabase = Object.create(null)

    this._load()

    // Register a global helper for the link database
    global.links = {
      /**
       * Adds an array of links to the database
       * @param  {Array} linkArray An array containing the links to be added
       * @return {void}          Does not return.
       */
      report: (linkArray) => {
        for (let link of linkArray) {
          // Create the entry if needed
          if (!this._globalLinkDatabase[link.source]) {
            this._globalLinkDatabase[link.source] = {}
            this._globalLinkDatabase[link.source].name = link.name
            this._globalLinkDatabase[link.source].outbound = []
            this._globalLinkDatabase[link.source].inbound = []
          } else {
            this._globalLinkDatabase[link.source].name = link.name
          }

          // Some links might have no target
          if (link.target) {
            // Add new links to the entry
            this._globalLinkDatabase[link.source].outbound.push(link.target)

            // Add a reciproqual inbound entry if needed
            if (!this._globalLinkDatabase[link.target]) {
              this._globalLinkDatabase[link.target] = {
                'name': '',
                'outbound': [],
                'inbound': []
              }
            }
            // Add only the inbound reference in the target node
            this._globalLinkDatabase[link.target].inbound.push(link.source)
          }
        }

        // If we're not booting anymore, update the link database
        if (!global.application.isBooting()) {
          global.ipc.send('links-database', JSON.parse(JSON.stringify(this._globalLinkDatabase)))
        }
      },
      /**
       * Removes the given linkArray from the database, i.e. decreases
       * outbound links until zero and then removes the link.
       * @param  {Array} linkArray The links to remove from the database
       * @return {void}          Does not return.
       */
      remove: (linkArray) => {
        for (let link of linkArray) {
          // Check if the source is known
          if (this._globalLinkDatabase[link.source]) {
            // Remove outbound reference from other links
            for (const i of this._globalLinkDatabase[link.source].inbound) {
              const index = this._globalLinkDatabase[i].outbound.indexOf(link.source)
              this._globalLinkDatabase[i].outbound.splice(index, 1)
            }

            // Remove the link
            delete this._globalLinkDatabase[link.source]
          }
        }

        // If we're not booting anymore, update the link database
        if (!global.application.isBooting()) {
          global.ipc.send('links-database', JSON.parse(JSON.stringify(this._globalLinkDatabase)))
        }
      },
      /**
       * Returns the global link database
       * @return {Object} An object containing all links.
       */
      getLinkDatabase: () => {
        return JSON.parse(JSON.stringify(this._globalLinkDatabase))
      },
      /**
       * Returns the special (= coloured) tags
       * @param  {String} name An optional name to get one. Otherwise, will return all.
       * @return {Array}      The special link array.
       */
      getSpecialTags: (name) => { return this.get(name) },
      /**
       * Updates the special links with an array of new ones.
       * @param  {Array} newlinks An array containing the links to be set.
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
    global.log.verbose('link provider shutting down ...')
    this._save()
    return true
  }

  /**
   * This function only (re-)reads the links on disk.
   * @return {LinkProvider} This for chainability.
   */
  _load () {
    // We are not checking if the user directory exists, b/c this file will
    // be loaded after the ZettlrConfig, which makes sure the dir exists.

    // Does the file already exist?
    try {
      fs.lstatSync(this._file)
      this._links = JSON.parse(fs.readFileSync(this._file, { encoding: 'utf8' }))
    } catch (e) {
      fs.writeFileSync(this._file, JSON.stringify([]), { encoding: 'utf8' })
      return this // No need to iterate over objects anymore
    }

    this._checkIntegrity()

    return this
  }

  /**
   * Simply writes the link data to disk.
   * @return {LinkProvider} This for chainability.
   */
  _save () {
    // (Over-)write the links
    fs.writeFileSync(this._file, JSON.stringify(this._links), { encoding: 'utf8' })

    return this
  }

  /**
   * This file makes sure all links fulfill certain criteria
   */
  _checkIntegrity () {
    let nullLink = { 'source': '20200101010101', 'target': '20200101010101', 'name': 'None' }
    for (let link of this._links) {
      if (typeof link === 'object') {
        if (!link.hasOwnProperty('source')) {
          link.source = nullLink.source
        }
        if (!link.hasOwnProperty('target')) {
          link.target = nullLink.target
        }
        if (!link.hasOwnProperty('name')) {
          link.name = nullLink.name
        }
      } else {
        // wtf is this? make it go away
        this._links.splice(this._links.indexOf(link), 1)
      }
    }

    // Now remove all links that fulfill the "not given" template above completely
    for (let link of this._links) {
      if (link === nullLink) {
        this._links.splice(this._links.indexOf(link), 1)
      }
    }

    return this
  }

  /**
   * Returns a link (or all, if name was not given)
   * @param  {String} [name=null] The link to be searched for
   * @return {Object}      Either undefined (as returned by Array.find()) or the tag
   */
  get (link = null) {
    if (!link) {
      return this._links
    }

    return this._links.find((elem) => { return (elem.source === link.source && elem.target === link.target && elem.name === link.name) })
  }

  /**
   * Add or change a given link.
   * @param {String} name  The link source's name
   * @param {String} source  The link source
   * @param {String} target  The link target
   */
  set (name, source, target) {
    let link = this.get({ 'name': name, 'source': source, 'target': target })
    // Either overwrite or add
    if (!link) {
      this._links.push({ 'name': name, 'source': source, 'target': target })
    }

    this._save()

    return this
  }

  /**
   * Updates all links (i.e. replaces them)
   * @param  {Array} links The new links as an array
   * @return {Boolean} Whether or not all links succeeded.
   */
  update (links) {
    this._links = []
    let retVal = true
    for (let l of links) {
      // Only update correctly set links
      if (l.hasOwnProperty('name') && l.hasOwnProperty('source') && l.hasOwnProperty('target')) {
        this.set(l.name, l.source, l.target)
      } else {
        retVal = false
      }
    }

    this._save()

    return retVal
  }
}

module.exports = new LinkProvider()
