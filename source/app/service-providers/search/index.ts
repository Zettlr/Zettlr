/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SearchProvider
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines a search provider that allows finding
 *                  things across the loaded workspaces.
 *
 * END HEADER
 */

import type LogProvider from '../log'
import type ProviderContract from '../provider-contract'
import { ipcMain } from 'electron'
import type { IPCAPI } from '../provider-contract'
import { compileBooleanQuery, searchFileBoolean, type SearchResult, type SearchQueryBoolean } from './util/boolean-search'
import type FSAL from '../fsal'
import broadcastIPCMessage from 'source/common/util/broadcast-ipc-message'
import type ConfigProvider from '../config'
import path from 'path'

export { SearchResult, FileContentSearchResult } from './util/boolean-search'

export type SearchProviderIPCAPI = IPCAPI<{
  'start-full-text-search': { query: string, restrictToDirectory: string, caseInsensitive: boolean },
  'cancel-search': unknown
}>

export class SearchProvider implements ProviderContract {
  /**
   * Keeps a count of all files that will be searched during a search-in-
   * progress. Used to calculate an overall progress.
   *
   * @var {number}
   */
  private sumFilesToSearch: number
  /**
   * Contains the absolute paths of all files that will be searched during the
   * ongoing search.
   *
   * @var {string[]}
   */
  private fileSearchQueue: string[]
  /**
   * Contains the current search query.
   *
   * @var {SearchQueryBoolean|undefined}
   */
  private currentQuery: SearchQueryBoolean|undefined

  constructor (private readonly _logger: LogProvider, private readonly _fsal: FSAL, private readonly _config: ConfigProvider) {
    this.currentQuery = undefined
    this.fileSearchQueue = []
    this.sumFilesToSearch = 0

    ipcMain.handle('search-provider', async (event, message: SearchProviderIPCAPI) => {
      const { command, payload } = message

      if (command === 'start-full-text-search') {
        return await this.startFullTextSearch(
          payload.query, payload.restrictToDirectory, payload.caseInsensitive
        )
      } else if (command === 'cancel-search') {
        // By simply removing all remaining files, we can let the search agent
        // finish its current search and then just stop (& emit the correct
        // events).
        this.currentQuery = undefined
        this.fileSearchQueue = []
        this.sumFilesToSearch = 0
      }
    })
  }

  async boot () {}

  async shutdown () {}

  /**
   * Begins a new full-text search
   *
   * @param   {string}   query                The query to search for
   * @param   {string}   restrictToDirectory  If provided, restricts the search to the provided directory
   * @param   {boolean}  caseInsensitive      Whether to perform a case insensitive search
   * @param   {string}   type                 The type of search. Currently unused.
   *
   * @return  {number}                        The number of files that will be searched.
   */
  private async startFullTextSearch (query: string, restrictToDirectory: string, caseInsensitive: boolean, type: 'boolean' = 'boolean'): Promise<number> {
    if (type !== 'boolean') {
      throw new Error(`Cannot start search: Type ${type} unrecognized.`)
    }

    this.currentQuery = compileBooleanQuery(query, caseInsensitive)
    if (restrictToDirectory.trim() === '') {
      // The user wants to search all workspaces
      const promises = this._config.get().app.openWorkspaces
        .map(ws => this._fsal.readDirectoryRecursively(ws))
      const allPaths = (await Promise.all(promises)).flat()
      for (const p of allPaths) {
        if (await this._fsal.isFile(p)) {
          this.fileSearchQueue.push(p)
        }
      }
    } else {
      // The user only wants to search a single directory.
      this.fileSearchQueue = await this._fsal.readDirectoryRecursively(restrictToDirectory)
    }

    this.sumFilesToSearch = this.fileSearchQueue.length

    // Start the search
    this.searchNextFile()
    
    // Return the number of files to search
    return this.fileSearchQueue.length
  }

  /**
   * Runs a single search using the next available file to search
   */
  private searchNextFile () {
    const nextFile = this.fileSearchQueue.shift()
    if (nextFile === undefined || this.currentQuery === undefined) {
      broadcastIPCMessage('search-provider', { type: 'search-end' })
      this.currentQuery = undefined
      return
    }

    this._logger.verbose(`[Search Provider] Searching file ${path.basename(nextFile)}...`)

    this.searchFileBoolean(nextFile, this.currentQuery)
      .then(rawResult => {
        // Save some resources both in the IPC and the renderer by not
        // reporting empty results. We do so by setting the result as undefined.
        const result = rawResult.length > 0 ? rawResult : undefined
        const total = this.sumFilesToSearch
        const remaining = this.fileSearchQueue.length
        const progress = (total - remaining) / total
        broadcastIPCMessage('search-provider', { type: 'search-result', file: nextFile, result, progress })
      })
      .catch(err => {
        this._logger.error(`[Search Provider] Could not search file ${nextFile}: ${err}`, err)
      })
      .finally(() => {
        // Do the next search
        this.searchNextFile()
      })
  }

  /**
   * Searches a file using a boolean search query
   *
   * @param   {string}              absPath  The file path
   * @param   {SearchQueryBoolean}  query    The query
   *
   * @return  {SearchResult}                 The search result
   */
  private async searchFileBoolean (absPath: string, query: SearchQueryBoolean): Promise<SearchResult> {
    const descriptor = await this._fsal.getDescriptorForAnySupportedFile(absPath)
    if (descriptor.type === 'other') {
      return []
    }

    const fileContent = await this._fsal.loadAnySupportedFile(absPath)
    return searchFileBoolean(descriptor, fileContent, query)
  }
}
