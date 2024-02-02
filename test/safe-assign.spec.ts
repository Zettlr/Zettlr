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

import safeAssign from '../source/common/util/safe-assign'
import { deepStrictEqual } from 'assert'

const inputs = [
  // First an input that is completely valid with regard to the reference.
  {
    a: null,
    b: {
      c: [ 'one', 'two', 'three' ],
      d: 1000
    }
  },
  // Second an input that has a prop more than the reference object
  {
    a: null,
    b: {
      c: [ 'one', 'two', 'three' ],
      d: 1000
    },
    unexpectedField: 'some value'
  },
  // Third an input that has one prop less than the reference object
  {
    b: {
      c: [ 'one', 'two', 'three' ],
      d: 1000
    }
  },
  // Based on a true story, as safeAssign apparently doesn't overwrite values
  {
    fullScreen: true
  },
  // A safeAssign will use values even if the reference has an undefined value
  {
    a: 'foo'
  }
]
const referenceObjects = [
  // Reference one
  {
    a: false,
    b: {
      c: [],
      d: -1
    }
  },
  // Reference two
  {
    a: false,
    b: {
      c: [],
      d: -1
    }
  },
  // Reference three
  {
    a: false,
    b: {
      c: [],
      d: -1
    }
  },
  {
    fullScreen: false,
    someOtherVar: 'Hello World'
  },
  {
    a: undefined
  }
]
const expectedOutputs = [
  // Expected output one
  {
    a: null,
    b: {
      c: [ 'one', 'two', 'three' ],
      d: 1000
    }
  },
  // Expected output two
  {
    a: null,
    b: {
      c: [ 'one', 'two', 'three' ],
      d: 1000
    }
  },
  // Expected output three
  {
    a: false, // This prop is taken from the reference
    b: {
      c: [ 'one', 'two', 'three' ],
      d: 1000
    }
  },
  // Expected output four
  {
    fullScreen: true,
    someOtherVar: 'Hello World'
  },
  // Expected output file
  {
    a: 'foo'
  }
]

describe('Utility#safeAssign()', function () {
  for (let i = 0; i < inputs.length; i++) {
    it('should return a properly merged object', function () {
      deepStrictEqual(safeAssign(inputs[i] as any, referenceObjects[i]), expectedOutputs[i])
    })
  }
})
