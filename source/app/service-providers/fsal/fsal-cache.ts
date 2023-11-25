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

import hash from '@common/util/hash'
import type LogProvider from '@providers/log'
import fs from 'fs'
import path from 'path'

export default class FSALCache {
  private readonly _datadir: string
  /**
   * Our cache data is a map of maps. The outer map constitutes shards, which
   * themselves contain maps of key-value pairs.
   */
  private readonly _data: Map<string, Map<string, any>>
  /**
   * This here is a Set which contains the keys of all values that have been
   * accessed. If a key is in here, we have accessed it. If it's not but in the
   * shard, that indicates we probably don't need it anymore.
   */
  private readonly _accessed: Set<string>

  private readonly _logger: LogProvider

  constructor (logger: LogProvider, datadir: string) {
    this._datadir = datadir
    this._logger = logger

    this._data = new Map()
    // Contains all keys that were requested before persist is called
    // Everything not in this Set will be cleaned out to keep the disk
    // space as small as possible.
    this._accessed = new Set()

    try {
      fs.lstatSync(this._datadir)
    } catch (err) {
      this._logger.warning(`[FSAL Cache] Cache data dir does not yet exist: ${this._datadir}.`)
      // Make sure the path exists
      fs.mkdirSync(this._datadir, { recursive: true })
    }
  }

  /**
   * Returns the value associated for a key without removing it.
   *
   * @param   {string}         key  The key to get
   *
   * @returns {any|undefined}       The key's value or undefined
   */
  get (key: string): any|undefined {
    const shard = this._loadShard(key)

    if (shard.has(key)) {
      this._accessed.add(key)
    }

    // BUG: Somehow the revived JSON objects contain the actual descriptors in
    // still stringified form; I don't know why, but see issue #4269
    const val = shard.get(key)

    if (typeof val === 'string') {
      return JSON.parse(val)
    } else {
      return val
    }
  }

  /**
   * Sets (potentially overwriting) a cache key.
   *
   * @param  {string}  key    The key to set
   * @param  {any}     value  Any JSONable data
   *
   * @return {boolean}        True on success, false otherwise.
   */
  set (key: string, value: any): boolean {
    try {
      JSON.stringify(value)
    } catch (err) {
      this._logger.error(`[FSAL Cache] Could not cache value for key ${key}: Not JSONable!`)
      return false
    }

    const shard = this._loadShard(key)
    this._accessed.add(key) // Obviously, a set key has been accessed
    shard.set(key, value)
    return true
  }

  /**
   * Removes the given key from the cache.
   *
   * @param   {string}  key  The key to remove
   *
   * @returns {boolean}      Whether the adapter has removed the key
   */
  del (key: string): boolean {
    if (this.has(key)) {
      const shard = this._loadShard(key)
      shard.delete(key)
      this._accessed.delete(key)
      return true
    }
    return false
  }

  /**
   * Returns true if the cache has the given key in memory.
   *
   * @param  {string}  key  The key to be searched
   *
   * @return {boolean}      True if the key exists
   */
  has (key: string): boolean {
    const shard = this._loadShard(key)
    return shard.has(key)
  }

  /**
   * Returns the value of key and removes the entry from the cache.
   *
   * @param  {string} key The key to pluck
   *
   * @return {any}        The value for the given key
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
    for (const [ shardKey, shard ] of this._data.entries()) {
      // Clean up the remnant keys
      for (const [key] of shard.entries()) {
        if (!this._accessed.has(key)) {
          shard.delete(key)
          deleted++
        }
      }

      try {
        // A map cannot be saved to disk directly, so we need to create an array
        // which is JSONable. This will then be correctly read into a new map
        // whenever we load this shard.
        fs.writeFileSync(path.join(this._datadir, shardKey), JSON.stringify(Array.from(shard.entries())))
      } catch (err) {
        this._logger.error(`[FSAL Cache] Could not persist shard ${shardKey}!`, err)
      }
    }

    this._logger.info(`[FSAL Cache] Cleaned up cache: Removed ${deleted} remnants.`)
  }

  /**
   * Clears the cache during runtime
   */
  clearCache (): void {
    // Two things need to be done:
    // First, flush everything from memory
    // Second: Remove all cache files
    this._data.clear()
    this._accessed.clear()

    // We'll collect the cache clearing actions to resolve them all
    let promises = []
    let directoryContents = fs.readdirSync(this._datadir)
    for (let file of directoryContents) {
      let realPath = path.join(this._datadir, file)
      promises.push(new Promise<void>((resolve, reject) => {
        fs.unlink(realPath, (err) => {
          if (err !== null) {
            reject(err)
          } else {
            resolve()
          }
        })
      }))
    }

    // Watch how the promises do
    Promise.all(promises).then(() => {
      this._logger.info('[FSAL Cache] Cache cleared!')
    }).catch((e) => {
      this._logger.error('[FSAL Cache] Error while clearing the cache!', e)
    })
  }

  /**
   * Lazily loads the shard for the given key.
   *
   * @param  {string}  key  The key for which the shard should be loaded
   *
   * @return {Map<string, any>} The loaded shard
   */
  _loadShard (key: string): Map<string, any> {
    // load a shard
    const shard = this._determineShard(key)

    // If the requested shard is already loaded, simply return that one.
    const maybeShard = this._data.get(shard)
    if (maybeShard !== undefined) {
      return maybeShard
    }

    // If the shard has not yet been loaded, do so.
    try {
      // Either return a persisted shard ...
      fs.lstatSync(path.join(this._datadir, shard))
      let content = fs.readFileSync(path.join(this._datadir, shard), { encoding: 'utf8' })
      const shardContents = new Map<string, any>(JSON.parse(content))
      this._data.set(shard, shardContents)
      return shardContents
    } catch (err) {
      // ... or create a new one.
      const shardContents = new Map()
      this._data.set(shard, shardContents)
      return shardContents
    }
  }

  /**
   * Algorithm to determine where to save the given key.
   *
   * @param  {string}  key  The key for which the shard should be determined
   * @return {string}       The shard key
   */
  _determineShard (key: string): string {
    // One more note: This caching algorithm will ensure
    // there'll be at most 99 files (10 to 99 and -1 to -9).
    return hash(key).toString().substring(0, 2)
  }
}
