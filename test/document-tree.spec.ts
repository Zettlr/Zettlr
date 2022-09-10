/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DocumentTree tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { DocumentTree, DTBranch, DTLeaf } from '../source/app/service-providers/documents/document-tree'
import { v4 as uuid4 } from 'uuid'
import assert from 'assert'
import 'mocha'

describe('Modules#DocumentTree', function () {
  it('should successfully create a tree', function () {
    const tree = new DocumentTree()

    assert(tree.node instanceof DTLeaf, 'tree.node is not a DTLeaf!')
  })

  it('should successfully serialize itself to JSON', function () {
    const tree = new DocumentTree()

    assert(tree.node instanceof DTLeaf, 'tree.node is not a DTLeaf!')

    const correctJSON = {
      type: 'leaf',
      id: '',
      openFiles: [],
      activeFile: null
    }

    const testJSON = tree.toJSON()

    correctJSON.id = tree.node.id

    assert.deepStrictEqual(testJSON, correctJSON, 'The serialized tree is not as expected!')
  })

  it('should successfully deserialize from JSON', async function () {
    const json = {
      type: 'leaf',
      id: uuid4(),
      openFiles: [],
      activeFile: null
    }

    const tree = await DocumentTree.fromJSON(json)

    assert.deepStrictEqual(json, tree.toJSON(), 'The serialized tree does not equal the original data!')
  })

  it('should correctly add splits to the tree', function () {
    const tree = new DocumentTree()

    // This JSON represents a 1-1/1 split (two panes top, one pane bottom)
    const correctJSON = {
      type: 'branch',
      id: '',
      sizes: [ 50, 50 ],
      direction: 'vertical',
      nodes: [
        {
          type: 'branch',
          id: '',
          sizes: [ 50, 50 ],
          direction: 'horizontal',
          nodes: [
            {
              type: 'leaf',
              id: '',
              openFiles: [],
              activeFile: null
            },
            {
              type: 'leaf',
              id: '',
              openFiles: [],
              activeFile: null
            }
          ]
        },
        {
          type: 'leaf',
          id: '',
          openFiles: [],
          activeFile: null
        }
      ]
    }

    const leaf = tree.node as DTLeaf
    leaf.split('vertical', 'after') // Node tree.node is now a DTBranch

    const branch = tree.node as DTBranch
    correctJSON.id = branch.id
    // Let's split the upper leaf into a horizontal branch
    const newLeaf = (branch.nodes[0] as DTLeaf).split('horizontal', 'after')
    correctJSON.nodes[0].id = (newLeaf.parent as DTBranch).id

    // Copy over the IDs as required for the assertion below
    // @ts-expect-error
    correctJSON.nodes[0].nodes[0].id = (branch.nodes[0].nodes[0] as DTLeaf).id
    // @ts-expect-error
    correctJSON.nodes[0].nodes[1].id = (branch.nodes[0].nodes[1] as DTLeaf).id
    correctJSON.nodes[1].id = (branch.nodes[1] as DTLeaf).id

    assert.deepStrictEqual(correctJSON, tree.toJSON(), 'The tree did not serialize into the correct format!')
  })
})
