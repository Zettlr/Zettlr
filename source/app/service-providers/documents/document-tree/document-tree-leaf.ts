import isFile from '@common/util/is-file'
import { OpenDocument, LeafNodeJSON } from '@dts/common/documents'
import { v4 as uuid4 } from 'uuid'
import { DocumentTree } from './document-tree'
import { DTBranch } from './document-tree-branch'
import { TabManager } from './tab-manager'

export class DTLeaf {
  // This is info concerning the tree structure
  private readonly _id: string
  private _parent: DTBranch|DocumentTree
  // The tab manager actually manages the data
  private readonly _tabManager: TabManager

  /**
   * Creates a new empty leaf.
   *
   * @param  {DTBranch|DocumentTree}  parent  The parent for this leaf
   * @param  {string}                 id      An optional ID, may be changed to ensure uniqueness
   */
  constructor (
    parent: DTBranch|DocumentTree,
    id: string = uuid4()
  ) {
    this._parent = parent
    this._tabManager = new TabManager()

    if (typeof id !== 'string') {
      id = uuid4()
    }

    // Ensure a unique ID
    let root = parent
    while (!(root instanceof DocumentTree)) {
      root = root.parent
    }

    while (root.findLeaf(id) !== undefined) {
      id = uuid4()
    }

    this._id = id
  }

  /**
   * Returns the tab manager associated with this leaf
   *
   * @return  {TabManager}  The tab manager instance
   */
  public get tabMan (): TabManager {
    return this._tabManager
  }

  /**
   * Returns the readonly ID for this leaf
   *
   * @return  {string}  The ID
   */
  public get id (): string {
    return this._id
  }

  /**
   * Returns this leaf's parent
   *
   * @return  {DTBranch|DocumentTree}  The parent
   */
  public get parent (): DTBranch|DocumentTree {
    return this._parent
  }

  /**
   * Sets the parent for this leaf
   *
   * @param   {DTBranch|DocumentTree}  parent  The new parent
   */
  public set parent (parent: DTBranch|DocumentTree) {
    this._parent = parent
  }

  /**
   * Directs the leaf to split itself. This can either mean to insert a new leaf
   * into its parent's child nodes, or to add the leaf to a new branch and
   * replace itself in the tree with that new branch.
   *
   * @param   {string}  direction  The direction in which to split
   * @param   {string}  insertion  Where to split (before the leaf, or after)
   *
   * @return  {DTLeaf}             Returns the newly created leaf
   */
  public split (direction: 'horizontal'|'vertical', insertion: 'before'|'after'): DTLeaf {
    if (this._parent instanceof DocumentTree && this._parent.direction === direction) {
      // this = leaf, parent = DocumentTree -> insert a branch
      const newBranch = new DTBranch(this._parent, direction)
      const newLeaf = new DTLeaf(newBranch)
      if (insertion === 'before') {
        newBranch.addNode(newLeaf)
        newBranch.addNode(this)
      } else {
        newBranch.addNode(this)
        newBranch.addNode(newLeaf)
      }
      this._parent.node = newBranch
      this._parent = newBranch
      return newLeaf
    } else if (this._parent instanceof DocumentTree) {
      const newBranch = new DTBranch(this._parent, direction)
      const newLeaf = new DTLeaf(newBranch)

      if (insertion === 'before') {
        newBranch.addNode(newLeaf)
        newBranch.addNode(this)
      } else {
        newBranch.addNode(this)
        newBranch.addNode(newLeaf)
      }

      this._parent.node = newBranch
      this._parent = newBranch
      return newLeaf
    } else if (this._parent.direction === direction) {
      // Same direction, and we're already in a split -> add a new node
      const newLeaf = new DTLeaf(this._parent)
      this._parent.addNode(newLeaf, this, insertion)
      return newLeaf
    } else {
      // Different direction -> replace this node with a new branch
      const newBranch = new DTBranch(this._parent, direction)
      const newLeaf = new DTLeaf(newBranch)

      if (insertion === 'before') {
        newBranch.addNode(newLeaf)
        newBranch.addNode(this)
      } else {
        newBranch.addNode(this)
        newBranch.addNode(newLeaf)
      }

      this._parent.addNode(newBranch, this, 'after')
      this._parent.removeNode(this)

      this._parent = newBranch
      return newLeaf
    }
  }

  /**
   * Returns this if the ID is this leaf's ID, else undefined.
   *
   * @param   {string}  id  The leaf ID
   *
   * @return  {DTLeaf}      This, or undefined
   */
  public findLeaf (id: string): DTLeaf|undefined {
    if (id === this._id) {
      return this
    }
  }

  /**
   * Creates a new leaf based on the nodeData provided
   *
   * @param   {DocumentTree|DTBranch}  parent    The parent for the leaf
   * @param   {any}                    nodeData  The node data
   *
   * @return  {Promise<DTLeaf>}                  Resolves with the new leaf
   */
  static fromJSON (parent: DocumentTree|DTBranch, nodeData: any): DTLeaf {
    const leaf = new DTLeaf(parent, nodeData.id)
    for (const file of nodeData.openFiles as OpenDocument[]) {
      if (typeof file.path !== 'string' || !isFile(file.path)) {
        continue
      }

      const success = leaf.tabMan.openFile(file.path, false)
      if (success) {
        leaf.tabMan.setPinnedStatus(file.path, file.pinned)
      } else {
        // TODO: Log the error that the file couldn't be opened
      }
    }

    // Revitalize the active File pointer
    const activeFile = leaf.tabMan.openFiles.find(e => e.path === nodeData.activeFile.path) ?? null
    leaf.tabMan.activeFile = activeFile
    return leaf
  }

  /**
   * Returns a JSON serializable representation for this leaf
   *
   * @return  {LeafNodeJSON}  The JSON data
   */
  public toJSON (): LeafNodeJSON {
    return {
      type: 'leaf',
      id: this._id,
      ...this._tabManager.toJSON()
    }
  }
}
