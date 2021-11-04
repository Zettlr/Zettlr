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

import Vue from 'vue'
import Vuex, { Store, StoreOptions } from 'vuex'
// import isAttachment from '../common/util/is-attachment'
import sanitizeHtml from 'sanitize-html'
import md2html from '../common/util/md-to-html'
import sort from '../main/modules/fsal/util/sort'
import { MDFileMeta, CodeFileMeta, DirMeta } from '../main/modules/fsal/types'

const path = (window as any).path
const ipcRenderer = (window as any).ipc as Electron.IpcRenderer

interface FSALEvent {
  event: 'remove'|'add'|'change'
  path: string
  timestamp: number
}

// This interface is being produced by the MarkdownEditor module in source/common
interface DocumentInfo {
  words: number
  chars: number
  chars_wo_spaces: number
  cursor: { ch: number, line: number }
  selections: Array<{
    selectionLength: number
    start: { ch: number, line: number }
    end: { ch: number, line: number }
  }>
}

function isAttachment (p: string): boolean {
  let ext = global.config.get('attachmentExtensions')
  return ext.includes(path.extname(p).toLowerCase())
}

function findPathDescriptor (targetPath: string, tree: any, treatAsAttachment: boolean = false): any|null {
  const prop = (treatAsAttachment) ? 'attachments' : 'children'
  // We need to find a target
  if (Array.isArray(tree)) {
    for (const descriptor of tree) {
      if (targetPath === descriptor.path) {
        // We have the correct element
        return descriptor
      } else if (targetPath.startsWith(String(descriptor.path) + String(path.sep)) && descriptor.type === 'directory') {
        // We have the correct tree
        return findPathDescriptor(targetPath, descriptor[prop], treatAsAttachment)
      }
    }
  } else if (tree.type === 'directory') {
    // Single tree element
    if (targetPath === tree.path) {
      // Found the element
      return tree
    }

    for (const child of tree[prop]) {
      if (targetPath === child.path) {
        // We got the correct child
        return child
      } else if (targetPath.startsWith(String(child.path) + String(path.sep)) && child.type === 'directory') {
        // Traverse further down
        return findPathDescriptor(targetPath, child[prop], treatAsAttachment)
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
  for (const attachment of descriptor.attachments) {
    // @ts-expect-error NOTE: The file metas have numbers to prevent circular
    // structures over IPC. In the renderer we only need to override it here.
    attachment.parent = descriptor
  }

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
 * What stuff do we need in our state? This interface defines everything.
 */
interface ZettlrState {
  /**
   * Contains the full file tree that is loaded into the app
   */
  fileTree: Array<MDFileMeta|CodeFileMeta|DirMeta>
  /**
   * Contains the last update timestamp from main
   */
  lastFiletreeUpdate: number
  /**
   * Contains the currently selected directory
   */
  selectedDirectory: any|null
  /**
   * Contains the currently active File in the editor
   */
  activeFile: any|null
  /**
   * Contains all open files in the editor
   */
  openFiles: any[]
  /**
   * Contains coloured tags that can be managed in the tag manager
   */
  colouredTags: any[]
  /**
   * Contains all tags across all files loaded into Zettlr
   */
  tagDatabase: any[]
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
}

const config: StoreOptions<ZettlrState> = {
  state: {
    fileTree: [],
    lastFiletreeUpdate: 0,
    selectedDirectory: null,
    activeFile: null,
    openFiles: [],
    colouredTags: [],
    tagDatabase: [],
    tagSuggestions: [],
    config: {},
    activeDocumentInfo: null,
    modifiedDocuments: [],
    tableOfContents: null,
    citationKeys: [],
    cslItems: []
  },
  getters: {
    file: state => (filePath: string, searchAttachments = false) => {
      return findPathDescriptor(filePath, state.fileTree, searchAttachments)
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
      const pathIndex = state.modifiedDocuments.findIndex(e => e === filePath)
      if (isClean === false && pathIndex === -1) {
        // Add the path if not already done
        state.modifiedDocuments.push(filePath)
        ipcRenderer.invoke('application', {
          command: 'update-modified-files',
          payload: state.modifiedDocuments
        })
          .catch(e => console.error(e))
      } else if (isClean === true && pathIndex > -1) {
        // Remove the path if in array
        state.modifiedDocuments.splice(pathIndex, 1)
        ipcRenderer.invoke('application', {
          command: 'update-modified-files',
          payload: state.modifiedDocuments
        })
          .catch(e => console.error(e))
      }
    },
    activeDocumentInfo: function (state, info) {
      Vue.set(state, 'activeDocumentInfo', info)
    },
    updateConfig: function (state, option) {
      // Here the same caveat as below applies, we cannot directly set dynamic
      // properties without losing Vue's reactivity, so we have to explicitly
      // preserve reactivity by using Vue.set for this.
      Vue.set(state.config, option, global.config.get(option))
    },
    addToFiletree: function (state, descriptor) {
      if (descriptor.parent == null && !state.fileTree.includes(descriptor)) {
        // It's a root, so insert at the root level
        if (descriptor.type === 'directory') {
          reconstructTree(descriptor)
        }
        state.fileTree.push(descriptor)
        // @ts-expect-error sort() doesn't expect meta descriptors.
        state.fileTree = sort(state.fileTree) // Omit sorting to sort name-up
      } else if (descriptor.parent != null) {
        const parentPath = descriptor.dir
        const parentDescriptor = findPathDescriptor(parentPath, state.fileTree)
        if (parentDescriptor === null) {
          console.warn(`Was about to add descriptor ${String(descriptor.path)} to the filetree, but the parent ${String(parentPath)} was null!`)
          return
        }
        if (parentDescriptor.children.find((elem: any) => elem.path === descriptor.path) !== undefined) {
          return // We already have this descriptor, nothing to do.
        } else if (parentDescriptor.attachments.find((elem: any) => elem.path === descriptor.path) !== undefined) {
          return // It was an attachment already there
        }
        descriptor.parent = parentDescriptor // Attach the child to its parent
        if (descriptor.type === 'directory') {
          // Make sure the parent pointers work correctly even inside this subtree
          reconstructTree(descriptor)
        }

        if (isAttachment(descriptor.path)) {
          parentDescriptor.attachments.push(descriptor)
          parentDescriptor.attachments.sort((a: any, b: any) => {
            if (a.name > b.name) {
              return -1
            } else if (a.name < b.name) {
              return 1
            } else {
              return 0
            }
          })
        } else {
          parentDescriptor.children.push(descriptor)
          Vue.set(parentDescriptor, 'children', sort(parentDescriptor.children, parentDescriptor.sorting))
        }
      } else {
        // NOTE: This is just in case we accidentally introduce a race condition.
        console.warn('[Store] Received event to add a descriptor to the filetree, but it was a root and already present:', descriptor)
      }
    },
    removeFromFiletree: function (state, pathToRemove) {
      if (isAttachment(pathToRemove)) {
        const parent = findPathDescriptor(path.dirname(pathToRemove), state.fileTree)
        if (parent === null) {
          return // No descriptor found
        }
        const idx = parent.attachments.find((elem: any) => elem.path === pathToRemove)
        if (idx > -1) {
          parent.attachments.splice(idx, 1)
        }
        return // Done
      }

      const descriptor = findPathDescriptor(pathToRemove, state.fileTree)

      if (descriptor === null) {
        return // No descriptor found -- nothing to do.
      }

      if (descriptor.parent == null) {
        const idx = state.fileTree.findIndex(elem => elem === descriptor)
        state.fileTree.splice(idx, 1)
      } else {
        const parentDescriptor = findPathDescriptor(descriptor.dir, state.fileTree)
        const idx = parentDescriptor.children.findIndex((elem: any) => elem === descriptor)
        parentDescriptor.children.splice(idx, 1)
      }
    },
    patchInFiletree: function (state, descriptor) {
      const attachment = isAttachment(descriptor.path)
      const ownDescriptor = findPathDescriptor(descriptor.path, state.fileTree, attachment)

      if (ownDescriptor === null) {
        console.error(`[Vuex::patchInFiletree] Could not find descriptor for ${descriptor.path as string}! Not patching.`)
        return
      }

      const protectedKeys = [ 'parent', 'children', 'attachments' ]

      for (const key of Object.keys(descriptor)) {
        if (protectedKeys.includes(key)) {
          continue // Don't overwrite protected keys which would result in dangling descriptors
        }

        ownDescriptor[key] = descriptor[key]
      }

      // Now we have to check if we had a directory. If so, we can know for sure
      // that the name did not change (because that would've resulted in a
      // removal and one addition) but rather something else, so we need to make
      // sure to simply re-sort it in case the sorting has changed.
      if (ownDescriptor.type === 'directory') {
        Vue.set(ownDescriptor, 'children', sort(ownDescriptor.children, ownDescriptor.sorting))
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

        if (ownDescriptor !== null) {
          state.selectedDirectory = ownDescriptor
        }
      }
    },
    updateActiveFile: function (state, descriptor) {
      state.activeFile = descriptor
    },
    updateOpenFiles: function (state, openFiles) {
      Vue.set(state, 'openFiles', openFiles)
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
          if (descriptor === null) {
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

// Make the Vuex-Store the default export
export default function (): Store<ZettlrState> {
  // Somehow this will otherwise say "config is possibly undefined", which is
  // weird. Maybe we can instantiate the store in a better way.
  (config as any).state.config = configToArrayMapper(global.config.get())
  return new Vuex.Store(config)
}
