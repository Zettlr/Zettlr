/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useDocumentTreeStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the window's document tree
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import { DP_EVENTS, type BranchNodeJSON, type LeafNodeJSON, type OpenDocument } from 'source/types/common/documents'
import { ref, type Ref } from 'vue'
import type { DocumentManagerIPCAPI, DocumentsUpdateContext } from '@providers/documents'
import { useWindowStateStore } from 'source/pinia'

const ipcRenderer = window.ipc
type DocumentTree = BranchNodeJSON|LeafNodeJSON

/**
 * Finds a leaf within a document tree
 *
 * @param   {DocumentTree}  tree    The tree to search
 * @param   {string}        leafId  The leaf ID to search for
 *
 * @return  {LeafNodeJSON}          The leaf, or undefined
 */
function findLeaf (tree: DocumentTree, leafId: string): LeafNodeJSON|undefined {
  if (tree.type === 'leaf' && tree.id === leafId) {
    return tree
  } else if (tree.type === 'branch') {
    for (const node of tree.nodes) {
      const found = findLeaf(node, leafId)
      if (found !== undefined) {
        return found
      }
    }
  }
}

/**
 * Extracts only the (data holding) leafs from a document tree
 *
 * @param   {DocumentTree}    tree  The input tree
 *
 * @return  {LeafNodeJSON[]}        Only the nodes from the tree
 */
function extractLeafs (tree: DocumentTree): LeafNodeJSON[] {
  let arr: LeafNodeJSON[] = []

  if (tree.type === 'leaf') {
    return [tree]
  } else {
    for (const node of tree.nodes) {
      if (node.type === 'leaf') {
        arr.push(node)
      } else {
        arr = arr.concat(extractLeafs(node))
      }
    }
  }

  return arr
}

/**
 * Recovers the full pane data and structure. NOTE: Since any state update can
 * remove and/or add multiple branches and leaves, we always have to recover the
 * full state, which may lead to visible flickering. However, because we store
 * all document content in the main process, this will not lead to data loss.
 *
 * @param   {ZettlrState}   state     The store state
 * @param   {DocumentTree}  treedata  The new treedata to apply
 */
function recoverState (paneStructure: Ref<BranchNodeJSON|LeafNodeJSON|undefined>, paneData: Ref<LeafNodeJSON[]>, lastLeafId: Ref<string|undefined>, treedata: DocumentTree): void {
  // By cloning one of the objects, we make sure that paneData and paneStructure
  // never share any pointers and hence cannot influence the respective other.
  paneData.value = extractLeafs(structuredClone(treedata))
  paneStructure.value = treedata
  const lastLeafExists = paneData.value.find(pane => pane.id === lastLeafId.value) !== undefined
  if (!lastLeafExists) {
    lastLeafId.value = undefined
  }

  // Here we also need to set the last leaf ID so that the user can
  // immediately begin opening files. If this is not set, the user must first
  // focus any of the leafs before clicking on a file does something, which
  // is unwanted behavior.
  if (paneData.value.length > 0 && lastLeafId.value === undefined) {
    lastLeafId.value = paneData.value[0].id
  }
}

/**
 * Applies a delta for just a single leaf node.
 *
 * @param   {ZettlrState}   state     The store state
 * @param   {DocumentTree}  treedata  The new tree data
 * @param   {string}        leafId    The leaf in question
 */
function copyDelta (paneData: Ref<LeafNodeJSON[]>, treedata: DocumentTree, context: DocumentsUpdateContext): void {
  const { leafId } = context
  if (leafId === undefined) {
    console.warn('Could not apply delta: leafId was not given')
    return
  }

  const localLeaf = paneData.value.find(leaf => leaf.id === leafId)
  const remoteLeaf = findLeaf(structuredClone(treedata), leafId)
  if (localLeaf === undefined || remoteLeaf === undefined) {
    // This can happen since we retrieve the treedata after the main process has
    // broadcast the actual event. In case of a removal of a leaf, for example,
    // the files will be closed prior to removing the leaf, but the leaf itself
    // won't be present in the remote treedata anymore. Therefore, we can just
    // do nothing here and wait for the actual event that will subsequently
    // remove the complete leaf.
    console.warn('Could not apply delta, either local or remote not available', localLeaf, remoteLeaf, leafId)
    return
  }

  localLeaf.activeFile = remoteLeaf.activeFile
  localLeaf.openFiles = remoteLeaf.openFiles
}

export const useDocumentTreeStore = defineStore('document-tree', () => {
  const windowStateStore = useWindowStateStore()
  const searchParams = new URLSearchParams(window.location.search)
  const windowId = searchParams.get('window_id')

  if (windowId === null) {
    throw new Error('Could not instantiate documentTreeStore: Required search param window_id not present.')
  }

  /**
   * Contains a full document tree managed by this window
   */
  const paneStructure = ref<BranchNodeJSON|LeafNodeJSON>() // TODO
  /**
   * Contains just the data points of the document tree
   */
  const paneData = ref<LeafNodeJSON[]>([])

  /**
   * Modified files are stored here (only the paths, though)
   */
  const modifiedDocuments = ref<string[]>([])

  const lastLeafId = ref<undefined|string>(undefined)
  const lastLeafActiveFile = ref<OpenDocument|undefined>(undefined)

  // Initial update for the pane structure ...
  ipcRenderer.invoke('documents-provider', { command: 'retrieve-tab-config', payload: { windowId } } as DocumentManagerIPCAPI)
    .then((treedata: LeafNodeJSON|BranchNodeJSON) => recoverState(paneStructure, paneData, lastLeafId, treedata))
    .catch(err => console.error(err))

  ipcRenderer.invoke('documents-provider', { command: 'get-file-modification-status' } as DocumentManagerIPCAPI)
    .then((modifiedFiles: string[]) => { modifiedDocuments.value = modifiedFiles })
    .catch(err => console.error(err))

  // ... and we listen to subsequent changes.
  ipcRenderer.on('documents-update', (evt, payload: { event: DP_EVENTS, context: DocumentsUpdateContext }) => {
    const { event, context } = payload
    // A file has been saved or modified
    if (event === DP_EVENTS.CHANGE_FILE_STATUS && context.status === 'modification') {
      ipcRenderer.invoke('documents-provider', { command: 'get-file-modification-status' } as DocumentManagerIPCAPI)
        .then((modifiedFiles: string[]) => { modifiedDocuments.value = modifiedFiles })
        .catch(err => console.error(err))
    } else {
      // We only tend to events that pertain this window
      if (context.windowId !== windowId) {
        return // None of our business
      }

      // Something in the document status has changed, here we simply pull in
      // the full config as it is in the main process, and dispatch it into
      // the worker who then has the task to apply a delta update with as few
      // changes as possible.
      ipcRenderer.invoke('documents-provider', { command: 'retrieve-tab-config', payload: { windowId } } as DocumentManagerIPCAPI)
        .then((treedata: LeafNodeJSON|BranchNodeJSON) => {
          // The task for this function is to apply the minimum necessary delta update
          // for the document tree. Due to Vue's happy reactivity, we have to maintain
          // two states: One for only the structure, and one only for the data. Since
          // the tree that's coming from main has both structure and data, we have to
          // disentangle both here and apply delta updates to each structure based on
          // the events the document provider is emitting here.

          switch (event) {
            // At the beginning, and whenever the structure of the tree changes, we have
            // to apply a full update.
            case DP_EVENTS.LEAF_CLOSED:
            case DP_EVENTS.NEW_LEAF:
              recoverState(paneStructure, paneData, lastLeafId, treedata)
              break
            // Events that pertain only to one leaf: no structural change
            case DP_EVENTS.ACTIVE_FILE:
            case DP_EVENTS.CHANGE_FILE_STATUS:
            case DP_EVENTS.OPEN_FILE:
            case DP_EVENTS.CLOSE_FILE:
            case DP_EVENTS.FILES_SORTED:
              copyDelta(paneData, treedata, context)
              break
          }

          // NOTE: We must ensure the paneData is correct before we (potentially set the leaf IDs)
          if (event === DP_EVENTS.ACTIVE_FILE) {
            const { leafId } = context
            lastLeafId.value = leafId
            const leaf = paneData.value.find(leaf => leaf.id === lastLeafId.value)
            if (leaf?.activeFile != null) {
              lastLeafActiveFile.value = leaf.activeFile
            } else {
              lastLeafActiveFile.value = undefined
            }
          }
        })
        .catch(err => console.error(err))
    }
  })

  ipcRenderer.on('shortcut', (event, command) => {
    if (command === 'toggle-distraction-free') {
      if (windowStateStore.distractionFreeMode === undefined && lastLeafId.value !== undefined) {
        windowStateStore.distractionFreeMode = lastLeafId.value
      } else if (windowStateStore.distractionFreeMode !== undefined && lastLeafId.value === windowStateStore.distractionFreeMode) {
        windowStateStore.distractionFreeMode = undefined
      } else if (windowStateStore.distractionFreeMode !== undefined && lastLeafId.value !== windowStateStore.distractionFreeMode) {
        windowStateStore.distractionFreeMode = lastLeafId.value
      }
    } else if (command === 'delete-file' && lastLeafActiveFile.value !== undefined) {
      ipcRenderer.invoke('application', {
        command: 'file-delete',
        payload: { path: lastLeafActiveFile.value.path }
      })
        .catch(err => console.error(err))
    }
  })

  return { paneStructure, paneData, modifiedDocuments, lastLeafId, lastLeafActiveFile }
})
