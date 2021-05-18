/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        localiseNumber tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const safeAssign = require('../source/common/util/safe-assign')
const assert = require('assert')

const inputs = [
  // First an input that is completely valid with regard to the reference.
  {
    'a': null,
    'b': {
      'c': [ 'one', 'two', 'three' ],
      'd': 1000
    }
  },
  // Second an input that has a prop more than the reference object
  {
    'a': null,
    'b': {
      'c': [ 'one', 'two', 'three' ],
      'd': 1000
    },
    'unexpectedField': 'some value'
  },
  // Third an input that has one prop less than the reference object
  {
    'b': {
      'c': [ 'one', 'two', 'three' ],
      'd': 1000
    }
  },
  // Based on a true story, as safeAssign apparently doesn't overwrite values
  {
    'fullScreen': true
  }
]
const referenceObjects = [
  // Reference one
  {
    'a': false,
    'b': {
      'c': [],
      'd': -1
    }
  },
  // Reference two
  {
    'a': false,
    'b': {
      'c': [],
      'd': -1
    }
  },
  // Reference three
  {
    'a': false,
    'b': {
      'c': [],
      'd': -1
    }
  },
  {
    'fullScreen': false,
    someOtherVar: 'Hello World'
  }
]
const expectedOutputs = [
  // Expected output one
  {
    'a': null,
    'b': {
      'c': [ 'one', 'two', 'three' ],
      'd': 1000
    }
  },
  // Expected output two
  {
    'a': null,
    'b': {
      'c': [ 'one', 'two', 'three' ],
      'd': 1000
    }
  },
  // Expected output three
  {
    'a': false, // This prop is taken from the reference
    'b': {
      'c': [ 'one', 'two', 'three' ],
      'd': 1000
    }
  },
  // Expected output four
  {
    'fullScreen': true,
    someOtherVar: 'Hello World'
  }
]

describe('Utility#safeAssign()', function () {
  for (let i = 0; i < inputs.length; i++) {
    it('should return a safely assigned object as expected', function () {
      assert.deepStrictEqual(safeAssign(inputs[i], referenceObjects[i]), expectedOutputs[i])
    })
  }
})
