/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DocumentTreeBranch
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class represents a branch of a document tree. A
 *                  DTBranch can contain a theoretically unlimited number of
 *                  branches and leafs, in either horizontal or vertical
 *                  direction. A branch is used to split up the various editors
 *                  within a main editor window. They manage anything required
 *                  to customize and modify those branches, such as the relative
 *                  sizes of all of its children.
 *
 * END HEADER
 */

import type { BranchNodeJSON } from '@dts/common/documents'
import { DocumentTree } from './document-tree'
import { DTLeaf } from './document-tree-leaf'
import { v4 as uuid4 } from 'uuid'

export class DTBranch {
  private readonly _nodes: Array<DTLeaf|DTBranch>
  private readonly _direction: 'horizontal'|'vertical'
  private _parent: DocumentTree|DTBranch
  private _sizes: number[]
  private readonly _id: string

  /**
   * Creates a new Branch object. By default it will be filled with no nodes.
   *
   * @param   {DocumentTree|DTBranch}  parent    The parent for this branch
   * @param   {string}                 dir       The direction, can be horizontal or vertical
   * @param   {string}                 id        An optional ID, may be changed to ensure uniqueness
   */
  constructor (parent: DocumentTree|DTBranch, dir: 'horizontal'|'vertical', id: string = uuid4()) {
    this._nodes = []
    this._parent = parent
    this._direction = dir
    this._sizes = []

    if (typeof id !== 'string') {
      id = uuid4()
    }

    // Ensure a unique ID
    let root = parent
    while (!(root instanceof DocumentTree)) {
      root = root.parent
    }

    while (root.findBranch(id) !== undefined) {
      id = uuid4()
    }

    this._id = id
  }

  /**
   * Returns the readonly ID for this branch
   *
   * @return  {string}  The ID
   */
  public get id (): string {
    return this._id
  }

  /**
   * Returns a list of all child nodes
   *
   * @return  {Array<DTLeaf|DTBranch>}  The child node list
   */
  public get nodes (): Array<DTLeaf|DTBranch> {
    return this._nodes
  }

  /**
   * Returns the sizes currently belonging to this branch
   *
   * @return  {number[]}  The size array
   */
  public get sizes (): number[] {
    return this._sizes
  }

  /**
   * Provides a new set of sizes for the node. This setter will ensure the sizes
   * are sane afterwards.
   *
   * @param   {number[]}  sizes  The new size set
   */
  public set sizes (sizes: number[]) {
    this._sizes = sizes
    this.ensureProperSizes()
  }

  /**
   * Returns the current parent of this branch
   *
   * @return  {DTBranch|DocumentTree}  The parent
   */
  public get parent (): DTBranch|DocumentTree {
    return this._parent
  }

  /**
   * Exchanges this branch's parent
   *
   * @param   {DTBranch|DocumentTree}  parent  The new parent
   */
  public set parent (parent: DTBranch|DocumentTree) {
    this._parent = parent
  }

  /**
   * Returns a list of all leafs in the tree
   *
   * @return  {DTLeaf[]}  The leaf list
   */
  public getAllLeafs (): DTLeaf[] {
    let ret: DTLeaf[] = []

    for (const node of this._nodes) {
      if (node instanceof DTLeaf) {
        ret.push(node)
      } else {
        ret = ret.concat(node.getAllLeafs())
      }
    }

    return ret
  }

  /**
   * Adds the provided node into the list of children nodes
   *
   * @param   {DTLeaf|DTBranch}  content        The node to be added
   * @param   {DTLeaf|DTBranch}  referenceNode  An optional reference node
   * @param   {before|after}     insertion      Where to insert content based on
   *                                            referenceNode, defaults to after
   */
  public addNode (content: DTLeaf|DTBranch, referenceNode?: DTLeaf|DTBranch, insertion?: 'before'|'after'): void {
    let idx = -1
    if (referenceNode !== undefined) {
      idx = this._nodes.indexOf(referenceNode)
    }

    if (idx > -1) {
      if (insertion === 'before') {
        this._nodes.splice(idx, 0, content)
      } else {
        this._nodes.splice(idx + 1, 0, content)
      }
    } else {
      this._nodes.push(content)
    }
    this.ensureProperSizes()
  }

  /**
   * Removes the given node from the list of child nodes
   *
   * @param   {DTLeaf|DTBranch}  node  The node to remove
   */
  public removeNode (node: DTLeaf|DTBranch): void {
    const idx = this._nodes.indexOf(node)
    if (idx === -1) {
      return
    }

    this._nodes.splice(idx, 1)

    // If we're now left with just a single leaf, remove this branch and
    // attach the remaining node itself to the parent.
    if (this._nodes.length === 1 && this._nodes[0] instanceof DTLeaf) {
      this._nodes[0].parent = this.parent
      if (this.parent instanceof DocumentTree) {
        this.parent.node = this._nodes[0]
      } else {
        this.parent.addNode(this._nodes[0], this, 'after')
        this.parent.removeNode(this)
      }
    } else if (this._nodes.length === 0) {
      // Similarly, if we've just dropped the last node, we can just remove
      // this thing from its parent.
      this.parent.removeNode(this)
    }

    this.ensureProperSizes()
  }

  /**
   * Finds the leaf with the given ID
   *
   * @param   {string}  id  The leaf's ID
   *
   * @return  {DTLeaf}      The leaf, or undefined
   */
  public findLeaf (id: string): DTLeaf|undefined {
    for (const node of this._nodes) {
      if (node instanceof DTLeaf && node.id === id) {
        return node
      } else if (node instanceof DTBranch) {
        const found = node.findLeaf(id)
        if (found !== undefined) {
          return found
        }
      }
    }
  }

  /**
   * Finds the branch with the given ID
   *
   * @param   {string}    id  The branch's ID
   *
   * @return  {DTBranch}      The branch, or undefined
   */
  public findBranch (id: string): DTBranch|undefined {
    if (id === this._id) {
      return this
    }

    for (const node of this._nodes) {
      if (node instanceof DTBranch) {
        const found = node.findBranch(id)
        if (found !== undefined) {
          return found
        }
      }
    }
  }

  /**
   * Returns the direction for this branch
   *
   * @return  {string}  The direction
   */
  public get direction (): 'horizontal'|'vertical' {
    return this._direction
  }

  /**
   * A utility function that checks whether the size values are all sane, and,
   * if not, recomputes them
   */
  private ensureProperSizes (): void {
    let hasProperSizes = true

    // The size array must be of the same length as our nodes
    if (this._nodes.length !== this._sizes.length) {
      hasProperSizes = false
    }

    // Also, all of this must sum up to 100 (percent)
    const totalSize = this._sizes.reduce((acc, val) => acc + val, 0)
    if (Math.round(totalSize) !== 100) {
      hasProperSizes = false
    }

    if (hasProperSizes) {
      return // All good
    }

    // Reset the sizes
    const size = 100 / this._nodes.length
    this._sizes = []
    for (let i = 0; i < this._nodes.length; i++) {
      this._sizes.push(size)
    }
  }

  /**
   * Create a new Branch from the given JSON data
   *
   * @param   {DocumentTree|DTBranch}  parent    The parent node
   * @param   {any}                    nodeData  The JSON data to fill the branch with
   *
   * @return  {Promise<DTBranch>}                 The new branch
   */
  static fromJSON (parent: DocumentTree|DTBranch, nodeData: any): DTBranch {
    if (typeof nodeData !== 'object') {
      throw new Error('Could not instantiate DTBranch: Provided JSON was not an object.')
    }

    const { direction, id, nodes, sizes } = nodeData

    if (typeof direction !== 'string' || (direction !== 'horizontal' && direction !== 'vertical')) {
      throw new Error(`Could not instantiate DTBranch: Invalid split direction: ${direction}`)
    }

    if (typeof id !== 'string') {
      throw new Error(`Could not instantiate DTBranch: ID was invalid: ${String(id)}`)
    }

    if (!Array.isArray(nodes)) {
      throw new Error(`Could not instantiate DTBranch: Nodes was not an array: ${typeof nodes}`)
    }

    // NOTE: After this point, we don't throw any more errors, since the branch
    // can be successfully instantiated. If any of the sub-nodes experience an
    // error, this will propagate through this function to the caller.
    const newBranch = new DTBranch(parent, direction, id)

    for (const subNode of nodes) {
      if (subNode.type === 'leaf') {
        newBranch.addNode(DTLeaf.fromJSON(newBranch, subNode))
      } else if (subNode.type === 'branch') {
        newBranch.addNode(DTBranch.fromJSON(newBranch, subNode))
      }
    }

    // We don't have to throw an error if the sizes are wrong, since then the
    // leafs/branches are simply equally large.
    if (Array.isArray(sizes) && sizes.every(x => typeof x === 'number') && sizes.length === nodes.length) {
      newBranch.sizes = nodeData.sizes
    }

    return newBranch
  }

  /**
   * Creates a JSON serializable representation for this branch
   *
   * @return  {BranchNodeJSON}  The JSON data
   */
  public toJSON (): BranchNodeJSON {
    const json: BranchNodeJSON = {
      type: 'branch',
      id: this._id,
      direction: this._direction,
      sizes: this._sizes,
      nodes: []
    }

    for (const node of this._nodes) {
      json.nodes.push(node.toJSON())
    }

    return json
  }
}
