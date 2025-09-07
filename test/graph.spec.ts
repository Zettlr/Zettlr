/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirectedGraph test
 * CVM-Role:        Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This tests the capabilities of the DG module
 *
 * END HEADER
 */

import DirectedGraph from '../source/win-stats/directed-graph'
import assert from 'assert'

const edgeList = [
  // First, let's add a loop
  { from: 'A', to: 'B' },
  { from: 'B', to: 'C' },
  { from: 'C', to: 'A' },
  // Then, let's make B more central
  { from: 'B', to: 'D' },
  { from: 'B', to: 'E' },
  { from: 'B', to: 'F' },
  // Finally, add a few backlinks
  { from: 'F', to: 'B' },
  { from: 'B', to: 'A' },
  { from: 'A', to: 'C' }
]

const isolates = [ 'G', 'H', 'I' ]

describe('DirectedGraph', function () {
  const DG = new DirectedGraph()

  it('should contain 6 vertices', function () {
    // Add the edges
    for (const edge of edgeList) {
      DG.addArc(edge.from, edge.to)
    }
    assert.strictEqual(DG.countVertices, 6)
  })

  it('should contain 9 arcs', function () {
    // Will be executed after the first test
    assert.strictEqual(DG.countArcs, 9)
  })

  it('should contain 1 component', function () {
    assert.strictEqual(DG.countComponents, 1)
  })

  it('should now contain 9 vertices', function () {
    // Now, add the isolates
    for (const isolate of isolates) {
      DG.addVertex(isolate)
    }
    assert.strictEqual(DG.countVertices, 9)
  })

  it('should now contain 3 isolates', function () {
    assert.strictEqual(DG.countIsolates, 3)
  })

  it('should now contain 4 components', function () {
    assert.strictEqual(DG.countComponents, 4)
  })

  it('should contain 3 components', function () {
    // Add another link
    DG.addArc('I', 'G')
    assert.strictEqual(DG.countComponents, 3)
  })

  it('should contain not add duplicate vertices', function () {
    const before = DG.countComponents
    // Add a duplicate vertex
    DG.addVertex('A')
    assert.strictEqual(DG.countComponents, before)
  })
})
