/**
 * BEGIN HEADER
 *
 * Contains:        Vue component function
 * CVM-Role:        Model
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
import getSorter from '@providers/fsal/util/sort'
import { AnyMetaDescriptor, CodeFileMeta, DirMeta, MDFileMeta, OtherFileMeta } from '@dts/common/fsal'
import { ColouredTag, TagDatabase } from '@dts/common/tag-provider'
import { SearchResultWrapper } from '@dts/common/search'

const path = window.path
const ipcRenderer = window.ipc

interface FSALEvent {
  event: 'remove'|'add'|'change'
  path: string
  timestamp: number
}

/**
 * This function quickly finds a given descriptor by path in the FSAL tree
 *
 * @param   {string}                       targetPath  The path to find a descriptor for
 * @param   {DirMeta|AnyMetaDescriptor[]}  tree        The tree to search
 *
 * @return  {AnyMetaDescriptor|null}                   The descriptor, or null if not found
 */
function findPathDescriptor (targetPath: string, tree: DirMeta|AnyMetaDescriptor[]): AnyMetaDescriptor|null {
  // We need to find a target
  if (Array.isArray(tree)) {
    for (const descriptor of tree) {
      if (targetPath === descriptor.path) {
        // We have the correct element
        return descriptor
      } else if (targetPath.startsWith(String(descriptor.path) + String(path.sep)) && descriptor.type === 'directory') {
        // We have the correct tree
        return findPathDescriptor(targetPath, descriptor.children)
      }
    }
  } else if (tree.type === 'directory') {
    // Single tree element
    if (targetPath === tree.path) {
      // Found the element
      return tree
    }

    for (const child of tree.children) {
      if (targetPath === child.path) {
        // We got the correct child
        return child
      } else if (targetPath.startsWith(String(child.path) + String(path.sep)) && child.type === 'directory') {
        // Traverse further down
        return findPathDescriptor(targetPath, child.children)
      }
    }
  }

  return null
}

/**
 * Reconstructs a descriptor tree by re-assigning the parent properties to the
 * correct object references, instead of just numbers. NOTE: You still have to
 * assign the parent of the descriptor itself.
 *
 * @param   {DirMeta}  descriptor  The directory descriptor to reconstruct
 */
function reconstructTree (descriptor: DirMeta): void {
  for (const child of descriptor.children) {
    // @ts-expect-error
    child.parent = descriptor
    if (child.type === 'directory') {
      reconstructTree(child)
    }
  }
}

function sanitizeFiletreeUpdates (events: FSALEvent[]): FSALEvent[] {
  const ret: FSALEvent[] = []

  for (const event of events) {
    if (event.event === 'remove') {
      // First: Check, if we have a corresponding add-event in history, and
      // remove that one.
      const addEvent = ret.findIndex(e => e.event === 'add' && e.path === event.path)
      if (addEvent > -1) {
        ret.splice(addEvent, 1)
        // Find all other events in between and splice them as well
        for (let i = 0; i < ret.length; i++) {
          if (ret[i].path.startsWith(event.path)) {
            ret.splice(i, 1)
            i-- // Important to not jump over events
          }
        }

        continue // Done here
      }
    }

    // Second: Check if we have events for some files/dirs that reside within
    // files/dirs that do not exist anymore -- we won't get any descriptor
    // for these anyway, so we can save some computational power here.
    // TODO: Is this even necessary ...?

    // In the very end, add the event to our return array
    ret.push(event)
  }

  return ret
}

function configToArrayMapper (config: any): any {
  // Heh, you're creating an object and call it array? Yes, sort of. What we get
  // from the config provider is a nested object, because that saves some typing
  // work (we can just define an object "display" which serves as a prefix for
  // all keys within it). What this function does is take any nested object and
  // basically transform it into a flat object with string keys (so, actually,
  // an associative array, but as we don't have that in JavaScript ... you know
  // the drill.) where the string keys are the dot-joined key-prefixes.
  const arr: any = {}

  for (const key of Object.keys(config)) {
    const value = config[key]
    const isArray = Array.isArray(value)
    const isUndefined = value === undefined
    const isNull = value === null
    const isNum = typeof value === 'number'
    const isString = typeof value === 'string'
    const isBool = typeof value === 'boolean'
    if (isArray || isUndefined || isNull || isNum || isString || isBool) {
      // Yep, above are all (possibly) checks we have to perform in order to be
      // certain that value is not a "normal" object with key-value pairs. This
      // means we have reached one leaf and can begin traversing up
      arr[key] = value
    } else {
      // Traverse one level deeper.
      const mapped = configToArrayMapper(value)
      for (const mappedKey in mapped) {
        // Add the namespace here
        arr[key + '.' + mappedKey] = mapped[mappedKey]
      }
    }
  }

  return arr
}

/**
 * Declare the Vuex store used in the MainWindow
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
      file: state => (filePath: string): MDFileMeta|CodeFileMeta|OtherFileMeta|DirMeta|null => {
        return findPathDescriptor(filePath, state.fileTree)
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
      announceModifiedFile: function (state, payload) {
        const { filePath, isClean } = payload
        // Since Proxies cannot intercept push and splice operations, we have to
        // re-assign the modifiedDocuments if a change occurred, so that attached
        // watchers are notified of this. An added benefit is that we can already
        // de-proxy the array here to send it across the IPC bridge.
        const newModifiedDocuments = state.modifiedDocuments.map(e => e)
        const pathIndex = newModifiedDocuments.findIndex(e => e === filePath)

        if (isClean === false && pathIndex === -1) {
          // Add the path if not already done
          newModifiedDocuments.push(filePath)
          ipcRenderer.invoke('application', {
            command: 'update-modified-files',
            payload: newModifiedDocuments
          })
            .catch(e => console.error(e))
          state.modifiedDocuments = newModifiedDocuments
        } else if (isClean === true && pathIndex > -1) {
          // Remove the path if in array
          newModifiedDocuments.splice(pathIndex, 1)
          ipcRenderer.invoke('application', {
            command: 'update-modified-files',
            payload: newModifiedDocuments
          })
            .catch(e => console.error(e))
          state.modifiedDocuments = newModifiedDocuments
        }
      },
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
      addToFiletree: function (state, descriptor) {
        const sorter = getSorter(
          state.config.sorting,
          state.config.sortFoldersFirst,
          state.config.fileNameDisplay,
          state.config.appLang,
          state.config.sortingTime
        )

        if (descriptor.parent == null && !state.fileTree.includes(descriptor)) {
          // It's a root, so insert at the root level
          if (descriptor.type === 'directory') {
            reconstructTree(descriptor)
          }
          state.fileTree.push(descriptor)
          state.fileTree = sorter(state.fileTree) // Omit sorting to sort name-up
        } else if (descriptor.parent != null) {
          const parentPath = descriptor.dir
          const parentDescriptor = findPathDescriptor(parentPath, state.fileTree) as DirMeta|null
          if (parentDescriptor === null) {
            console.warn(`Was about to add descriptor ${String(descriptor.path)} to the filetree, but the parent ${String(parentPath)} was null!`)
            return
          }

          if (parentDescriptor.children.find((elem: any) => elem.path === descriptor.path) !== undefined) {
            return // We already have this descriptor, nothing to do.
          }

          descriptor.parent = parentDescriptor // Attach the child to its parent
          if (descriptor.type === 'directory') {
            // Make sure the parent pointers work correctly even inside this subtree
            reconstructTree(descriptor)
          }

          parentDescriptor.children.push(descriptor)
          parentDescriptor.children = sorter(parentDescriptor.children, parentDescriptor.sorting)
        } else {
          // NOTE: This is just in case we accidentally introduce a race condition.
          console.warn('[Store] Received event to add a descriptor to the filetree, but it was a root and already present:', descriptor)
        }
      },
      removeFromFiletree: function (state, pathToRemove) {
        const descriptor = findPathDescriptor(pathToRemove, state.fileTree)

        if (descriptor === null) {
          return // No descriptor found -- nothing to do.
        }

        if (descriptor.parent == null) {
          const idx = state.fileTree.findIndex(elem => elem === descriptor)
          state.fileTree.splice(idx, 1)
        } else {
          const parentDescriptor = findPathDescriptor(descriptor.dir, state.fileTree) as DirMeta|null
          if (parentDescriptor !== null) {
            const idx = parentDescriptor.children.findIndex((elem: any) => elem === descriptor)
            parentDescriptor.children.splice(idx, 1)
          }
        }
      },
      patchInFiletree: function (state, descriptor: AnyMetaDescriptor) {
        const ownDescriptor = findPathDescriptor(descriptor.path, state.fileTree)
        const sorter = getSorter(
          state.config.sorting,
          state.config.sortFoldersFirst,
          state.config.fileNameDisplay,
          state.config.appLang,
          state.config.sortingTime
        )

        if (ownDescriptor === null) {
          console.error(`[Vuex::patchInFiletree] Could not find descriptor for ${descriptor.path}! Not patching.`)
          return
        }

        const protectedKeys = [ 'parent', 'children', 'attachments' ]

        for (const key of Object.keys(descriptor) as Array<keyof AnyMetaDescriptor>) {
          if (protectedKeys.includes(key)) {
            continue // Don't overwrite protected keys which would result in dangling descriptors
          }

          // @ts-expect-error Typescript doesn't like in place mutation :(
          ownDescriptor[key] = descriptor[key]
        }

        // Now we have to check if we had a directory. If so, we can know for sure
        // that the name did not change (because that would've resulted in a
        // removal and one addition) but rather something else, so we need to make
        // sure to simply re-sort it in case the sorting has changed.
        // If we have a file, update the parent instead.
        if (ownDescriptor.type === 'directory') {
          ownDescriptor.children = sorter(ownDescriptor.children, ownDescriptor.sorting)
        } else if (ownDescriptor.type === 'file' && ownDescriptor.parent != null) {
          const parentDescriptor = ownDescriptor.parent as unknown as DirMeta
          parentDescriptor.children = sorter(parentDescriptor.children, parentDescriptor.sorting)
        }
      },
      lastFiletreeUpdate: function (state, payload) {
        state.lastFiletreeUpdate = payload
      },
      updateOpenDirectory: function (state, descriptor) {
        if (descriptor === null) {
          state.selectedDirectory = null
        } else {
          const ownDescriptor = findPathDescriptor(descriptor.path, state.fileTree)

          if (ownDescriptor !== null && ownDescriptor.type === 'directory') {
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
      filetreeUpdate: async function (context) {
        // When this function is called, an fsal-state-updated event has been
        // emitted from the main process because something in the FSAL has
        // changed. We need to reflect this here in the main application window
        // so that the filemanager always shows the correct state.

        // We need to perform three steps: First, retrieve all the history events
        // since we last checked (we initialise the "lastChecked" property with
        // 0 so that we will initially get all events), and then, for each event,
        // first retrieve the necessary information, and finally apply this locally.
        const events: FSALEvent[] = await ipcRenderer.invoke('application', { command: 'get-filetree-events', payload: context.state.lastFiletreeUpdate })

        if (events.length === 0) {
          return // Nothing to do
        }

        // A first problem we might encounter is that there has been an addition
        // and subsequently a removal of the same file/directory. We need to
        // account for this. We do so by first sanitizing the events that need
        // to be processed.
        const saneEvents = sanitizeFiletreeUpdates(events)

        for (const event of saneEvents) {
          if (event.timestamp <= context.state.lastFiletreeUpdate) {
            console.warn('FSAL event had an outdated timestamp -- skipping', event.event, event.path, event.timestamp)
            continue
          }

          // In the end, we also need to update our filetree update timestamp
          context.commit('lastFiletreeUpdate', event.timestamp)

          if (event.event === 'remove') {
            this.commit('removeFromFiletree', event.path)
          } else if (event.event === 'add') {
            const descriptor = await ipcRenderer.invoke('application', { command: 'get-descriptor', payload: event.path })
            if (descriptor === undefined) {
              console.error(`The descriptor for path ${event.path} was empty!`)
            } else {
              context.commit('addToFiletree', descriptor)
            }
          } else if (event.event === 'change') {
            const descriptor = await ipcRenderer.invoke('application', { command: 'get-descriptor', payload: event.path })
            if (descriptor === null) {
              console.error(`The descriptor for path ${event.path} was empty!`)
            } else {
              this.commit('patchInFiletree', descriptor)
            }
          }
        }

        // Now, dispatch another event. This will only run this function once, and
        // will do nothing if there are no new events. This is meant as a convenience
        // if there are more than one event in a succession
        context.dispatch('filetreeUpdate').catch(e => console.error(e))
      },
      updateOpenDirectory: async function (context) {
        const directory = await ipcRenderer.invoke('application', { command: 'get-open-directory' })
        const curDir = context.state.selectedDirectory

        if (curDir === null && directory === null) {
          return // The above is only true if both are null
        } else if (curDir !== null && curDir.path === directory.path) {
          return // Same directory, nothing to update
        }

        context.commit('updateOpenDirectory', directory)

        // In case the user quickly switched, we need to re-run this
        context.dispatch('updateOpenDirectory').catch(e => console.error(e))
      },
      updateActiveFile: async function (context) {
        const openFile = await ipcRenderer.invoke('application', { command: 'get-active-file' })
        const thisActiveFile = context.state.activeFile
        if (openFile === null && thisActiveFile === null) {
          return
        } else if (openFile?.path === thisActiveFile?.path) {
          return
        }

        context.commit('updateActiveFile', openFile)

        // In case the user quickly switched, re-run this dispatcher
        context.dispatch('updateActiveFile').catch(e => console.error(e))
        // Update the tag suggestions
        context.dispatch('regenerateTagSuggestions').catch(e => console.error(e))
      },
      updateOpenFiles: async function (context) {
        const openFiles = await ipcRenderer.invoke('application', { command: 'get-open-files' })
        context.commit('updateOpenFiles', openFiles)
      },
      regenerateTagSuggestions: async function (context) {
        if (context.state.activeFile === null) {
          return // Nothing to do
        }

        if (context.state.activeFile.type !== 'file') {
          return // Can only generate suggestions for Markdown files
        }

        const descriptor = await ipcRenderer.invoke('application', {
          command: 'get-file-contents',
          payload: context.state.activeFile.path
        })

        if (descriptor == null) {
          console.error('Could not regenerate tag suggestions: Main returned', descriptor)
          return
        }

        const suggestions = []
        for (const tag of Object.keys(context.state.tagDatabase)) {
          if (String(descriptor.content).includes(tag) && descriptor.tags.includes(tag) === false) {
            suggestions.push(tag)
          }
        }

        context.commit('setTagSuggestions', suggestions)
      }
    }
  }

  return config
}

// Make the Vuex-Store the default export
export default function (): Store<ZettlrState> {
  return createStore(getConfig())
}
