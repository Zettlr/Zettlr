/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DocumentTree
 * CVM-Role:        Model
 * Maintainer:      Hendrik Ery
 * License:         GNU GPL v3
 *
 * Description:     This file contains the DocumentTree class. It represents the
 *                  editors within the main windows. There is one DocumentTree
 *                  per main window open, and these trees are managed by the
 *                  documents provider. The trees themselves support any
 *                  operation that should be expected from them, such as
 *                  splitting leafs horizontally and vertically, and moving
 *                  stuff around.
 *
 * END HEADER
 */

import type { LeafNodeJSON, BranchNodeJSON } from '@dts/common/documents'
import { DTBranch } from './document-tree-branch'
import { DTLeaf } from './document-tree-leaf'

/**
 * This is the root instance of a document tree. It can contain a single node
 * which is either a leaf, if the window does not contain any splits, or a
 * branch.
 */
export class DocumentTree {
  /**
   * The root node of the tree
   *
   * @var {DTBranch|DTLeaf}
   */
  private _node: DTBranch|DTLeaf

  /**
   * Creates a new document tree (i.e. a new Window)
   *
   * @return  {DocumentTree}  The new tree
   */
  constructor () {
    this._node = new DTLeaf(this)
  }

  /**
   * Sets the root node for the tree
   *
   * @param  {DTBranch|DTLeaf}  data  The new node
   */
  public set node (data: DTBranch|DTLeaf) {
    this._node = data
  }

  /**
   * Returns the root node for the tree
   *
   * @return  {DTBranch|DTLeaf}  The root node
   */
  public get node (): DTBranch|DTLeaf {
    return this._node
  }

  /**
   * Finds the leaf with the given ID
   *
   * @param   {string}  id  The leaf's ID
   *
   * @return  {DTLeaf}      The leaf, or undefined
   */
  public findLeaf (id: string): DTLeaf|undefined {
    if (this._node === undefined) {
      return undefined
    }

    return this._node.findLeaf(id)
  }

  /**
   * Finds the branch with the given ID
   *
   * @param   {string}    id  The branch's ID
   *
   * @return  {DTBranch}      The branch, or undefined
   */
  public findBranch (id: string): DTBranch|undefined {
    if (this._node === undefined || this._node instanceof DTLeaf) {
      return undefined
    } else {
      return this._node.findBranch(id)
    }
  }

  /**
   * Returns a list of all leafs in the tree
   *
   * @return  {DTLeaf[]}  The leaf list
   */
  public getAllLeafs (): DTLeaf[] {
    if (this._node instanceof DTLeaf) {
      return [this._node]
    } else {
      return this._node.getAllLeafs()
    }
  }

  /**
   * Returns the direction of the root branch, if the tree has a root branch.
   * Undefined, if the tree has only a leaf.
   *
   * @return  {string|undefined}  The direction, or undefined
   */
  public get direction (): 'horizontal'|'vertical'|undefined {
    if (this._node instanceof DTLeaf) {
      return undefined
    } else {
      return this._node.direction
    }
  }

  /**
   * Removes the given node from the list of child nodes
   *
   * @param   {DTLeaf|DTBranch}  node  The node to remove
   */
  public removeNode (node: DTLeaf|DTBranch): void {
    if (this._node === node) {
      const newLeaf = new DTLeaf(this)
      this._node = newLeaf
    }
  }

  /**
   * Revitalizes a document tree from JSON data
   *
   * @param   {any}           data  The data (already de-serialized from string)
   *
   * @return  {DocumentTree}        The tree
   */
  static fromJSON (data: any): DocumentTree {
    if (Array.isArray(data)) {
      throw new Error('Could not instantiate tree: Data was an array')
    }

    if (data.type === undefined) {
      throw new Error('Could not instantiate tree: Data missing required property "type"')
    }

    if (![ 'leaf', 'branch' ].includes(data.type)) {
      throw new Error(`Could not instantiate tree: data.type contained unrecognized value ${data.type as string}`)
    }

    const newTree = new DocumentTree()

    if (data.type === 'leaf') {
      newTree.node = DTLeaf.fromJSON(newTree, data)
    } else if (data.type === 'branch') {
      newTree.node = DTBranch.fromJSON(newTree, data)
    }

    return newTree
  }

  /**
   * Returns a JSON representation of this tree that can be stringified
   *
   * @return  {any}     The tree as JSON
   */
  public toJSON (): LeafNodeJSON|BranchNodeJSON {
    return this._node.toJSON()
  }
}
