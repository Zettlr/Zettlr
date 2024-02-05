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

import { createStore as baseCreateStore, type StoreOptions, type Store } from 'vuex'
import { type InjectionKey } from 'vue'
import { type ColoredTag } from '@providers/tags'
import type { SearchResultWrapper } from '@dts/common/search'

// Import Actions
import updateBibliographyAction from './actions/update-bibliography'
import { type WritingTarget } from '@providers/targets'
import updateSnippetsAction from './actions/update-snippets'

const ipcRenderer = window.ipc

/**
 * The injection key is required for store access from within composition API
 * components
 */
export const key: InjectionKey<Store<ZettlrState>> = Symbol('store key')

/**
 * This is the main window's store state, including all properties we have
 */
export interface ZettlrState {
  activeFile: null
  /**
   * Contains coloured tags that can be managed in the tag manager
   */
  colouredTags: ColoredTag[]
  /**
   * Holds all current writing targets
   */
  writingTargets: WritingTarget[]
  /**
   * Citation keys to be found within the current document
   */
  citationKeys: string[]
  /**
   * The currently rendered bibliography (if applicable)
   */
  bibliography: [BibliographyOptions, string[]]|undefined
  /**
   * All CSL items available in the currently loaded database
   */
  cslItems: any[]
  /**
   * Snippets (including file contents)
   */
  snippets: Array<{ name: string, content: string }>
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
  const config: StoreOptions<ZettlrState> = {
    state () {
      return {
        // TODO: Move to a documents pinia store
        searchResults: [],
        // TODO: Move to an autocomplete state (?)
        activeFile: null,
        colouredTags: [],
        writingTargets: [],
        citationKeys: [],
        bibliography: undefined,
        snippets: [],
        cslItems: []
      }
    },
    mutations: {
      colouredTags: function (state, tags) {
        state.colouredTags = tags
      },
      updateWritingTargets: function (state, targets: WritingTarget[]) {
        state.writingTargets = targets
      },
      updateCitationKeys: function (state, newKeys: string[]) {
        // Update the citations, removing possible duplicates
        state.citationKeys = [...new Set(newKeys)]
      },
      updateBibliography: function (state, bibliography) {
        state.bibliography = bibliography
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
      },
      snippets: function (state, snippets) {
        state.snippets = snippets
      }
    },
    actions: {
      updateBibliography: updateBibliographyAction,
      updateSnippets: updateSnippetsAction,
      updateWritingTargets: async (ctx) => {
        const targets: WritingTarget[] = await ipcRenderer.invoke('targets-provider', {
          command: 'get-targets'
        })

        ctx.commit('updateWritingTargets', targets)
      }
    }
  }

  return config
}

/**
 * Returns a new Vuex Store
 *
 * @return  {Store<ZettlrState>}  The instantiated store
 */
export default function createStore (): Store<ZettlrState> {
  return baseCreateStore<ZettlrState>(getConfig())
}
