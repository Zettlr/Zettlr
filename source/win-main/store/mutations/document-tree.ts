/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DocumentTreeMutation
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Applies a delta update to the document tree
 *
 * END HEADER
 */

import { DP_EVENTS, type LeafNodeJSON, type BranchNodeJSON } from '@dts/common/documents'
import { type ZettlrState } from '..'
import { type DocumentsUpdateContext } from '@providers/documents'

type DocumentTree = BranchNodeJSON|LeafNodeJSON

interface ActionContext {
  event: DP_EVENTS|'init'
  context: DocumentsUpdateContext
  treedata: LeafNodeJSON|BranchNodeJSON
}

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
 * Clones an arbitrary object. May throw errors in case of data that the JSON
 * parser cannot handle.
 *
 * @param   {T}  input  The input data
 *
 * @return  {T}         The cloned output
 */
function clone<T> (input: T): T {
  return JSON.parse(JSON.stringify(input))
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
function recoverState (state: ZettlrState, treedata: DocumentTree): void {
  // By cloning one of the objects, we make sure that paneData and paneStructure
  // never share any pointers and hence cannot influence the respective other.
  state.paneData = extractLeafs(clone(treedata))
  state.paneStructure = treedata
  const lastLeafExists = state.paneData.find(pane => pane.id === state.lastLeafId) !== undefined
  if (!lastLeafExists) {
    state.lastLeafId = undefined
  }

  // Here we also need to set the last leaf ID so that the user can
  // immediately begin opening files. If this is not set, the user must first
  // focus any of the leafs before clicking on a file does something, which
  // is unwanted behavior.
  if (state.paneData.length > 0 && state.lastLeafId === undefined) {
    state.lastLeafId = state.paneData[0].id
  }
}

/**
 * Applies a delta for just a single leaf node.
 *
 * @param   {ZettlrState}   state     The store state
 * @param   {DocumentTree}  treedata  The new tree data
 * @param   {string}        leafId    The leaf in question
 */
function copyDelta (state: ZettlrState, treedata: DocumentTree, context: DocumentsUpdateContext): void {
  const { leafId } = context
  if (leafId === undefined) {
    console.warn('Could not apply delta: leafId was not given')
    return
  }

  const localLeaf = state.paneData.find(leaf => leaf.id === leafId)
  const remoteLeaf = findLeaf(clone(treedata), leafId)
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

/**
 * Applies a delta update to the structure and/or data of the editor panes. The
 * function attempts to apply the update to the smallest possible subtree in
 * order to prevent excessive re-rendering.
 *
 * @param   {ZettlrState}  state    The store state
 * @param   {any}          payload  The payload that's coming from main
 */
export default function (state: ZettlrState, payload: ActionContext): void {
  // The task for this function is to apply the minimum necessary delta update
  // for the document tree. Due to Vue's happy reactivity, we have to maintain
  // two states: One for only the structure, and one only for the data. Since
  // the tree that's coming from main has both structure and data, we have to
  // disentangle both here and apply delta updates to each structure based on
  // the events the document provider is emitting here.
  const { event, context, treedata } = payload

  switch (event) {
    // At the beginning, and whenever the structure of the tree changes, we have
    // to apply a full update.
    case 'init':
    case DP_EVENTS.LEAF_CLOSED:
    case DP_EVENTS.NEW_LEAF:
      recoverState(state, treedata)
      break
    // Events that pertain only to one leaf: no structural change
    case DP_EVENTS.ACTIVE_FILE:
    case DP_EVENTS.CHANGE_FILE_STATUS:
    case DP_EVENTS.OPEN_FILE:
    case DP_EVENTS.CLOSE_FILE:
    case DP_EVENTS.FILES_SORTED:
      copyDelta(state, treedata, context)
      break
    // This default action may come in handy
    default:
      console.warn(`[Vuex::documentTreeUpdate] Could not update document tree: Undefined event ${event}`)
  }
}
