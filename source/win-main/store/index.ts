/**
 * BEGIN HEADER
 *
 * Contains:        Vuex store entry point
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file holds the configuration for the global Vuex store.
 *                  We only have a Vuex store in the main application window
 *                  as this one needs to actually handle a huge state – something
 *                  not applicable to the other windows.
 *
 * END HEADER
 */

import { StoreOptions, createStore, Store } from 'vuex'
import sanitizeHtml from 'sanitize-html'
import { getConverter } from '@common/util/md-to-html'
import { CodeFileMeta, DirMeta, MDFileMeta, OtherFileMeta } from '@dts/common/fsal'
import { ColouredTag, TagDatabase } from '@dts/common/tag-provider'
import { SearchResultWrapper } from '@dts/common/search'
import { locateByPath } from '@providers/fsal/util/locate-by-path'
import configToArrayMapper from './config-to-array'

// Import Mutations
import addToFiletreeMutation from './mutations/add-to-filetree'
import removeFromFiletreeMutation from './mutations/remove-from-filetree'
import patchInFiletreeMutation from './mutations/patch-in-filetree'
import announceModifiedFileMutation from './mutations/announce-modified-file'

// Import Actions
import filtreeUpdateAction from './actions/filtree-update'
import regenerateTagSuggestionsAction from './actions/regenerate-tag-suggestions'
import updateOpenDirectoryAction from './actions/update-open-directory'
import updateActiveFileAction from './actions/update-active-file'
import updateOpenFilesAction from './actions/update-open-files'

/**
 * This is the main window's store state, including all properties we have
 */
export interface ZettlrState {
  /**
   * Contains the full file tree that is loaded into the app
   */
  fileTree: Array<MDFileMeta|CodeFileMeta|DirMeta>
  /**
   * Contains the last update timestamp from main
   */
  lastFiletreeUpdate: number
  /**
   * This array contains the paths of directories which are open (necessary to
   * keep the state during filtering, etc.)
   */
  uncollapsedDirectories: string[]
  /**
   * Contains the currently selected directory
   */
  selectedDirectory: DirMeta|null
  /**
   * Contains the currently active File in the editor
   */
  activeFile: MDFileMeta|null
  /**
   * Contains all open files in the editor
   */
  openFiles: MDFileMeta[]
  /**
   * Contains coloured tags that can be managed in the tag manager
   */
  colouredTags: ColouredTag[]
  /**
   * Contains all tags across all files loaded into Zettlr
   */
  tagDatabase: TagDatabase[]
  /**
   * Contains a list of suggested tags for the current active file.
   */
  tagSuggestions: string[]
  /**
   * Holds all configuration options. These need to be stored here separately
   * to make use of the reactivity of Vue. We'll basically be binding the config
   * listener to this store state. It's basically a dictionary for quick access.
   */
  config: any
  /**
   * Info about the currently active document
   */
  activeDocumentInfo: DocumentInfo|null
  /**
   * Modified files are stored here (only the paths, though)
   */
  modifiedDocuments: string[]
  /**
   * Contains the current table of contents of the active document
   */
  tableOfContents: any|null
  /**
   * Citation keys to be found within the current document
   */
  citationKeys: string[]
  /**
   * All CSL items available in the currently loaded database
   */
  cslItems: any[]
  /**
   * This variable stores search results from the global search
   */
  searchResults: SearchResultWrapper[]
}

/**
 * Instantiates a new Store configuration
 *
 * @return  {StoreOptions<ZettlrState>}  The instantiated store
 */
function getConfig (): StoreOptions<ZettlrState> {
  // Enclose an md2html converter since the ToC updates need to go fast and
  // we can't instantiate a showdown converter every time
  const md2html = getConverter(window.getCitation)

  const config: StoreOptions<ZettlrState> = {
    state () {
      return {
        fileTree: [],
        lastFiletreeUpdate: 0,
        uncollapsedDirectories: [],
        selectedDirectory: null,
        activeFile: null,
        openFiles: [],
        colouredTags: [],
        tagDatabase: [],
        tagSuggestions: [],
        config: configToArrayMapper(window.config.get()),
        activeDocumentInfo: null,
        modifiedDocuments: [],
        tableOfContents: null,
        citationKeys: [],
        cslItems: [],
        searchResults: []
      }
    },
    getters: {
      file: state => (filePath: string): MDFileMeta|CodeFileMeta|OtherFileMeta|DirMeta|undefined => {
        return locateByPath(state.fileTree, filePath)
      }
    },
    mutations: {
      updateTableOfContents: function (state, toc) {
        for (const entry of toc) {
          entry.text = md2html(entry.text)
          entry.text = sanitizeHtml(entry.text, {
            // Headings may be emphasised and contain code
            allowedTags: [ 'em', 'kbd', 'code' ]
          })
        }
        state.tableOfContents = toc
      },
      announceModifiedFile: announceModifiedFileMutation,
      activeDocumentInfo: function (state, info) {
        state.activeDocumentInfo = info
      },
      addUncollapsedDirectory: function (state, dirPath) {
        if (!state.uncollapsedDirectories.includes(dirPath)) {
          state.uncollapsedDirectories.push(dirPath)
        }
      },
      removeUncollapsedDirectory: function (state, dirPath) {
        const idx = state.uncollapsedDirectories.indexOf(dirPath)
        if (idx > -1) {
          state.uncollapsedDirectories.splice(idx, 1)
        }
      },
      updateConfig: function (state, option) {
        state.config[option] = window.config.get(option)
      },
      addToFiletree: addToFiletreeMutation,
      patchInFiletree: patchInFiletreeMutation,
      removeFromFiletree: removeFromFiletreeMutation,
      lastFiletreeUpdate: function (state, payload) {
        state.lastFiletreeUpdate = payload
      },
      updateOpenDirectory: function (state, descriptor) {
        if (descriptor === null) {
          state.selectedDirectory = null
        } else {
          const ownDescriptor = locateByPath(state.fileTree, descriptor.path)

          if (ownDescriptor !== undefined && ownDescriptor.type === 'directory') {
            state.selectedDirectory = ownDescriptor
          }
        }
      },
      updateActiveFile: function (state, descriptor) {
        state.activeFile = descriptor
      },
      updateOpenFiles: function (state, openFiles) {
        state.openFiles = openFiles
      },
      colouredTags: function (state, tags) {
        state.colouredTags = tags
      },
      updateTagDatabase: function (state, tags) {
        state.tagDatabase = tags
      },
      setTagSuggestions: function (state, suggestions) {
        state.tagSuggestions = suggestions
      },
      updateCitationKeys: function (state, newKeys: string[]) {
        // Update the citations, removing possible duplicates
        state.citationKeys = [...new Set(newKeys)]
      },
      updateCSLItems: function (state, newItems: any[]) {
        state.cslItems = newItems
      },
      clearSearchResults: function (state) {
        state.searchResults = []
      },
      addSearchResult: function (state, result: SearchResultWrapper) {
        state.searchResults.push(result)
        // Also make sure to sort the search results by relevancy (note the
        // b-a reversal, since we want a descending sort)
        state.searchResults.sort((a, b) => b.weight - a.weight)
      }
    },
    actions: {
      filetreeUpdate: filtreeUpdateAction,
      updateOpenDirectory: updateOpenDirectoryAction,
      updateActiveFile: updateActiveFileAction,
      updateOpenFiles: updateOpenFilesAction,
      regenerateTagSuggestions: regenerateTagSuggestionsAction
    }
  }

  return config
}

/**
 * Returns a new Vuex Store
 *
 * @return  {Store<ZettlrState>}  The instantiated store
 */
export default function (): Store<ZettlrState> {
  return createStore(getConfig())
}
