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

import { DP_EVENTS, LeafNodeJSON, BranchNodeJSON } from '@dts/common/documents'
import { ZettlrState } from '..'

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
 * Finds a branch within the document tree
 *
 * @param   {DocumentTree}    tree      The tree to search
 * @param   {string}          branchId  The branch ID to search for
 *
 * @return  {BranchNodeJSON}            The branch, or undefined
 */
function findBranch (tree: DocumentTree, branchId: string): BranchNodeJSON|undefined {
  if (tree.type === 'leaf') {
    return undefined
  } else if (tree.id === branchId) {
    return tree
  } else {
    for (const node of tree.nodes) {
      if (node.type === 'branch') {
        const found = findBranch(node, branchId)
        if (found !== undefined) {
          return found
        }
      }
    }
  }
}

/**
 * Finds the parent branch of the given leaf
 *
 * @param   {DocumentTree}              tree        The tree to search
 * @param   {string}                    idOrBranch  The leaf ID whose parent to search for
 *
 * @return  {BranchNodeJSON|undefined}              The parent branch, or undefined
 */
function findParentBranch (tree: DocumentTree, idOrBranch: string|BranchNodeJSON): BranchNodeJSON|undefined {
  if (tree.type === 'leaf') {
    return undefined
  }

  for (const node of tree.nodes) {
    if (node.type === 'leaf' && node.id === idOrBranch) {
      return tree
    } else if (node.type === 'branch') {
      if (node === idOrBranch) {
        return tree
      } else {
        const found = findParentBranch(node, idOrBranch)
        if (found !== undefined) {
          return found
        }
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
 * parser cannot handle
 *
 * @param   {T}  input  The input data
 *
 * @return  {T}         The cloned output
 */
function clone<T> (input: T): T {
  return JSON.parse(JSON.stringify(input))
}

/**
 * Recovers the full pane data and structure. ATTENTION: Only use to recover from
 * an otherwise unrecoverable option, since this will trigger a complete re-render
 * of the GUI, and may lead to data loss!
 *
 * @param   {ZettlrState}   state     The store state
 * @param   {DocumentTree}  treedata  The new treedata to apply
 */
function recoverState (state: ZettlrState, treedata: DocumentTree): void {
  // By cloning one of the objects, we make sure that paneData and paneStructure
  // never share any pointers and hence cannot influence the respective other.
  state.paneData = extractLeafs(clone(treedata))
  state.paneStructure = treedata
}

/**
 * Applies a delta update on the smallest possible sub-tree in order to insert a
 * new leaf into the pane structure.
 *
 * @param   {ZettlrState}   state     The store state
 * @param   {DocumentTree}  treedata  The new tree data
 * @param   {any}           context   Context information associated with the event
 */
function applyNewLeafDelta (state: ZettlrState, treedata: DocumentTree, context: any): void {
  // Extract the information from the context
  const originLeaf = context.originLeaf as string
  const newLeaf = context.newLeaf as string
  const direction = context.direction as 'horizontal'|'vertical'
  const insertion = context.insertion as 'before'|'after'
  // Get the necessary objects
  const localOriginLeaf = findLeaf(state.paneStructure, originLeaf)
  const newRemoteLeaf = findLeaf(clone(treedata), newLeaf)

  if (localOriginLeaf === undefined || newRemoteLeaf === undefined) {
    console.error(`Could not apply delta update for new leaf: Origin leaf ${originLeaf} or new remote leaf ${newLeaf} not found! Recovering full state.`)
    recoverState(state, treedata)
    return
  }

  // The data structure itself is very basic, fortunately. Since its just an
  // array containing all the actual data points, we can simply add it to the
  // paneData list. This won't yet trigger a re-render since the information is
  // not used directly in any template.
  state.paneData.push(newRemoteLeaf)

  // We have three options of what could've happened: (a) The root was a leaf,
  // then it will have been split; (b) the direction of the local parent is
  // the same, then we can splice the new leaf in; (c) the direction is
  // different, then we have to replace the local leaf with the new parent branch
  if (state.paneStructure.type === 'leaf' && originLeaf === state.paneStructure.id) {
    state.paneStructure = treedata // The whole tree is the smallest subtree here
  } else {
    const localBranch = findParentBranch(state.paneStructure, originLeaf)
    if (localBranch === undefined) {
      console.error('Could not apply delta update for new leaf: local parent not found! Recovering full tree.')
      recoverState(state, treedata)
      return
    }

    const idx = localBranch.nodes.indexOf(localOriginLeaf)
    if (localBranch.direction === direction) {
      // Insert according to `insertion`
      if (insertion === 'after') {
        localBranch.nodes.splice(idx + 1, 0, newRemoteLeaf)
      } else {
        localBranch.nodes.splice(idx, 0, newRemoteLeaf)
      }
    } else {
      // Replace old node
      const newRemoteParent = findParentBranch(clone(treedata), newLeaf)
      if (newRemoteParent === undefined) {
        console.error('Could not apply delta update for new leaf: remote parent not found! Recovering full tree.')
        recoverState(state, treedata)
        return
      }
      localBranch.nodes[idx] = newRemoteParent
    }

    // Copy over new sizes
    const remoteBranch = findBranch(treedata, localBranch.id)
    if (remoteBranch !== undefined) {
      localBranch.sizes = clone(remoteBranch.sizes)
    }
  }
}

/**
 * Applies a delta update on the smallest possible sub-tree in order to remove a
 * leaf from the pane structure.
 *
 * @param   {ZettlrState}   state     The store state
 * @param   {DocumentTree}  treedata  The new tree data
 * @param   {any}           context   Context information associated with the event
 */
function applyRemoveLeafDelta (state: ZettlrState, treedata: DocumentTree, context: any): void {
  const removedLeafId = context.leafId as string
  const localLeaf = findLeaf(state.paneStructure, removedLeafId)
  // The removed leaf can never be the root node itself, so it will have a parent
  const localParent = findParentBranch(state.paneStructure, removedLeafId)

  if (state.lastLeafId === removedLeafId) {
    state.lastLeafId = undefined
  }

  if (localLeaf === undefined || localParent === undefined) {
    console.error(`Could not find removed leaf ${removedLeafId} or its local parent. Recovering full state.`)
    recoverState(state, treedata)
    return
  }

  // Now, again, removing the leaf from the paneData is trivial
  const dataIdx = state.paneData.findIndex(leaf => leaf.id === removedLeafId)
  state.paneData.splice(dataIdx, 1)
  const readabilityIdx = state.readabilityModeActive.indexOf(removedLeafId)
  if (readabilityIdx > -1) {
    state.readabilityModeActive.splice(readabilityIdx, 1)
  }

  // Removing the node from the local branch is more difficult. We have three
  // options here: (a) localParent has more than one child. In that case, we can
  // simply remove it. (b) the localParent is the root and localLeaf is its only
  // child. In that case, we need to "recover" the full state. (c) localParent
  // has only one child, in which case localParent itself has been removed. This
  // is a recursive problem.
  if (localParent.nodes.length > 1) {
    // (a) There were enough children so we can just remove the leaf.
    const structureIdx = localParent.nodes.indexOf(localLeaf)
    localParent.nodes.splice(structureIdx, 1)
    const remoteParent = findBranch(treedata, localParent.id)
    if (remoteParent !== undefined) {
      localParent.sizes = clone(remoteParent.sizes)
    }
  } else if (localParent === state.paneStructure) {
    // localParent has only one child and it's the root. This is the only time
    // where a full recovery is adequate.
    recoverState(state, treedata)
  } else if (localParent.nodes.length === 1) {
    // Removing the leaf has left zero children, i.e. the parent itself has been
    // removed. However, this is a recursive problem since this process could be
    // repeated up until the root.
    let smallestSubtree: BranchNodeJSON|undefined = localParent
    let subtreeBranch: BranchNodeJSON|undefined
    do {
      subtreeBranch = smallestSubtree
      smallestSubtree = findParentBranch(state.paneStructure, smallestSubtree)
    } while (smallestSubtree !== undefined && smallestSubtree.nodes.length === 1)

    if (smallestSubtree === undefined || subtreeBranch === undefined) {
      console.error(`Could not remove leaf ${removedLeafId} since no smallest subtree was found. Recovering full state.`)
      recoverState(state, treedata)
      return
    }

    smallestSubtree.nodes.splice(smallestSubtree.nodes.indexOf(subtreeBranch), 1)
    // Finally, there will now be new sizes, and the smallest subtree will also
    // be present on the remote data
    const remoteBranch = findBranch(treedata, smallestSubtree.id)
    if (remoteBranch !== undefined) {
      smallestSubtree.sizes = clone(remoteBranch.sizes)
    }
  }
}

/**
 * Applies a delta for just a single leaf node.
 *
 * @param   {ZettlrState}   state     The store state
 * @param   {DocumentTree}  treedata  The new tree data
 * @param   {string}        leafId    The leaf in question
 */
function copyDelta (state: ZettlrState, treedata: DocumentTree, leafId: string): void {
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

function ensureAllLeafsExist (state: ZettlrState, treedata: DocumentTree): void {
  const remoteLeafs = extractLeafs(clone(treedata))

  if (remoteLeafs.length !== state.paneData.length) {
    console.error(`Length differential found: ${remoteLeafs.length} remote leafs; ${state.paneData.length} local leafs. Recovering...`)
    state.paneData = remoteLeafs
  }
}

/**
 * Applies a delta update to the structure and/or data of the editor panes. The
 * function attempts to apply the update to the smallest possible subtree in
 * order to prevent excessive re-rendering.
 *
 * @param   {ZettlrState}  state    The store state
 * @param   {any}          payload  The payload that's coming from main
 */
export default function (state: ZettlrState, payload: any): void {
  // The task for this function is to apply the minimum necessary delta update
  // for the document tree. Due to Vue's happy reactivity, we have to maintain
  // two states: One for only the structure, and one only for the data. Since
  // the tree that's coming from main has both structure and data, we have to
  // disentangle both here and apply delta updates to each structure based on
  // the events the document provider is emitting here.
  const event: DP_EVENTS|'init' = payload.event
  const context: any = payload.context
  const treedata: DocumentTree = payload.treedata

  switch (event) {
    // This event is not emitted by the document provider. Rather, it happens
    // once after the window has been created to apply the initial "update" that
    // fills the state.
    case 'init': {
      recoverState(state, treedata)
      // Here we also need to set the last leaf ID so that the user can
      // immediately begin opening files. If this is not set, the user must first
      // focus any of the leafs before clicking on a file does something, which
      // is unwanted behavior.
      const leafs = extractLeafs(treedata)
      if (leafs.length > 0) {
        state.lastLeafId = leafs[0].id
      }
      break
    }
    // Events that pertain only to one leaf: no structural change
    case DP_EVENTS.ACTIVE_FILE:
    case DP_EVENTS.CHANGE_FILE_STATUS:
    case DP_EVENTS.OPEN_FILE:
    case DP_EVENTS.CLOSE_FILE:
    case DP_EVENTS.FILES_SORTED:
      copyDelta(state, treedata, context.leafId)
      break
    case DP_EVENTS.LEAF_CLOSED: // One leaf removed
      applyRemoveLeafDelta(state, treedata, context)
      ensureAllLeafsExist(state, treedata)
      break
    case DP_EVENTS.NEW_LEAF: // New leaf
      applyNewLeafDelta(state, treedata, context)
      ensureAllLeafsExist(state, treedata)
      break
  }
}
