/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FSALCache class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is a simple cache class
 *                  that slows down the initial loading of files
 *                  a little bit, but then makes up for it by
 *                  speeding up the boot time of Zettlr between
 *                  25 percent and over 90 percent by enabling us
 *                  to read in a small amount of cache files. Tests
 *                  with approx. 6.000 files have shown that roughly
 *                  100 cache files result which enable above-mentioned
 *                  performance-gains.
 *
 * END HEADER
 */

import fs from 'fs'
import path from 'path'

export default class FSALCache {
  _datadir: string
  _data: any
  _accessed: any

  constructor (datadir: string) {
    this._datadir = datadir
    this._data = {}
    // Hash table for all keys that were requested before persist is called
    // Everything not in this table will be cleaned out to keep the disk
    // space as small as possible.
    this._accessed = {}

    try {
      fs.lstatSync(this._datadir)
    } catch (e) {
      console.log('Cache data dir does not yet exist.', this._datadir)
      // Make sure the path exists
      fs.mkdirSync(this._datadir, { 'recursive': true })
    }
  }

  /**
   * Returns the value associated for a key without removing it.
   * @param {string} key The key to get
   * @returns {any} The key's value or undefined
   */
  get (key: string): any {
    if (!this._hasShard(key)) this._loadShard(key)
    if (this.has(key)) {
      this._accessed[key] = true
    } else {
      return undefined
    }
    return this._data[this._determineShard(key)][key]
  }

  /**
   * Sets (potentially overwriting) a cache key.
   * @param {string} key The key to set
   * @param {any} value Any JSONable data
   * @return {boolean} True on success, false otherwise.
   */
  set (key: string, value: any): boolean {
    try {
      JSON.stringify(value)
    } catch (error) {
      global.log.error(`Could not set cache value ${key}: Not JSONable!`, error.message)
      return false
    }

    if (!this._hasShard(key)) this._loadShard(key)
    this._accessed[key] = true // Obviously, a set key has been accessed
    this._data[this._determineShard(key)][key] = value
    return true
  }

  /**
   * Removes the given key from the cache.
   * @param {String} key The key to remove
   * @returns {Boolean} Whether the adapter has removed the key
   */
  del (key: string): boolean {
    if (this.has(key)) {
      delete this._data[this._determineShard(key)][key]
      if (this._accessed.hasOwnProperty(key)) delete this._accessed[key]
      return true
    }
    return false
  }

  /**
   * Returns true if the cache has the given key in memory.
   * @param {String} key The key to be searched
   */
  has (key: string): boolean {
    if (!this._hasShard(key)) this._loadShard(key)
    return this._data[this._determineShard(key)].hasOwnProperty(key)
  }

  /**
   * Returns the value of key and removes the entry from the cache.
   * @param {String} key The key to pluck
   */
  pluck (key: string): any {
    let val = JSON.parse(JSON.stringify(this.get(key)))
    this.del(key)
    return val
  }

  /**
   * Persist all cache data on disk.
   */
  persist (): void {
    let deleted = 0
    // Saves all currently loaded shards to disk
    for (let shard of Object.keys(this._data)) {
      // Clean up the remnant keys
      for (let key of Object.keys(this._data[shard])) {
        if (!this._accessed.hasOwnProperty(key)) {
          delete this._data[shard][key]
          deleted++
        }
      }

      try {
        fs.writeFileSync(path.join(this._datadir, shard), JSON.stringify(this._data[shard]))
      } catch (e) {
        global.log.error(`Could not save shard ${shard} on disk!`, e)
      }
    }

    if (deleted > 0) global.log.info(`Cleaned up FSAL cache: Removed ${deleted} remnants.`)

    // Reset the access table
    this._accessed = {}
  }

  /**
   * Clears the cache during runtime
   */
  clearCache (): void {
    // Two things need to be done:
    // First, flush everything from memory
    // Second: Remove all cache files
    this._data = {}
    this._accessed = {}

    // We'll collect the cache clearing actions to resolve them all
    let promises = []
    let directoryContents = fs.readdirSync(this._datadir)
    for (let file of directoryContents) {
      let realPath = path.join(this._datadir, file)
      promises.push(new Promise((resolve, reject) => {
        fs.unlink(realPath, (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      }))
    }

    // Watch how the promises do
    Promise.all(promises).then(() => {
      global.log.info('Cache cleared!')
    }).catch((e) => {
      global.log.error('Error while clearing the cache!', e)
    })
  }

  /**
   * Lazily loads the shard for the given key.
   * @param {String} key The key for which the shard should be loaded
   */
  _loadShard (key: string): void {
    // load a shard
    let shard = this._determineShard(key)

    try {
      fs.lstatSync(path.join(this._datadir, shard))
      let content = fs.readFileSync(path.join(this._datadir, shard), { encoding: 'utf8' })
      this._data[shard] = JSON.parse(content)
    } catch (err) {
      this._data[shard] = {}
    }
  }

  /**
   * Returns true if the given shard has already been loaded.
   * @param {String} key The key to query a shard for
   */
  _hasShard (key: string): boolean {
    return this._data.hasOwnProperty(this._determineShard(key))
  }

  /**
   * Algorithm to determine where to save the given key.
   * @param {String} key The key for which the shard should be determined
   */
  _determineShard (key: string): string {
    // Here's the algorithm for choosing the shard:
    // Based off the first two characters of the key
    // whoooooooooooooo. Well, but the keys will only
    // be hashes, so whatever lol. Nothing fancy as
    // Instagram does (cf. https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c)

    // One more note: This caching algorithm will ensure
    // there'll be at most 99 files (10 to 99 and -1 to -9).

    let shard = key
    if (typeof shard !== 'string') shard = key.toString()
    return shard.substr(0, 2)
  }
}
