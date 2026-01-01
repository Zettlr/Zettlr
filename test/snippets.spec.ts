import { EditorState } from '@codemirror/state'
import { template2snippet } from '../source/common/modules/markdown-editor/autocomplete/snippets'
import { configField } from '../source/common/modules/markdown-editor/util/configuration'
import { deepEqual, strictEqual } from 'assert'
import { DateTime } from 'luxon'

const YEAR = DateTime.now().year

const TEST_SNIPPETS = [
  // Test 1
  {
    template: 'Test $1 tabstop.',
    expected: {
      string: 'Test  tabstop.',
      selections: [
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 14,
            head: 14
          }]
        },
      ]
    }
  },
  // Test 2
  {
    template: 'Test ${1:default} text',
    expected: {
      string: 'Test default text',
      selections: [
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 12
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 17,
            head: 17
          }]
        },
      ]
    }
  },
  // Test 3
  {
    template: 'Test ${1:nested placeholder ${2:$CURRENT_YEAR} variable} replacement',
    expected: {
      string: `Test nested placeholder ${YEAR} variable replacement`,
      selections: [
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 37
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 24,
            head: 28
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 49,
            head: 49
          }]
        },
      ]
    }
  },
  // Test 4
  {
    template: 'Test \\${1:escaped} \\$2 placeholders',
    expected: {
      string: 'Test \\${1:escaped} \\$2 placeholders',
      selections: []
    }
  },
  // Test 5
  {
    template: 'Test ${1:nested \\${2:escaped \\$3} placeholders}',
    expected: {
      string: 'Test nested \\${2:escaped \\$3} placeholders',
      selections: [
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 42
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 42,
            head: 42
          }]
        },
      ]
    }
  },
  // Test 6
  {
    template: 'Test ${1:nested ${2:placeholders $3 with $4 no} defaults}',
    expected: {
      string: 'Test nested placeholders  with  no defaults',
      selections: [
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 43
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 12,
            head: 34
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 25,
            head: 25
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 31,
            head: 31
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 43,
            head: 43
          }]
        },
      ]
    }
  },
  // Test 7
  {
    template: 'Test ${1:nested ${2:placeholders} for ${3:recursive ${4:parsing}}}',
    expected: {
      string: 'Test nested placeholders for recursive parsing',
      selections: [
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 46
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 12,
            head: 24
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 29,
            head: 46
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 39,
            head: 46
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 46,
            head: 46
          }]
        },
      ]
    }
  },
  // Test 8
  {
    template: 'Test ${1:${2:${3:${4:${5:${6:${7:${8:${9:$10}}}}}}}}} depth',
    expected: {
      string: 'Test  depth',
      selections: [
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 5,
            head: 5
          }]
        },
        {
          main: 0,
          ranges: [{
            anchor: 11,
            head: 11
          }]
        }
      ]
    }
  }
]

describe('MarkdownEditor#template2snippet()', function () {
  const state = EditorState.create({
    doc: '',
    extensions: [
      configField
    ]
  })

  TEST_SNIPPETS.forEach(({ template, expected}, idx) => {
    it(`${idx + 1}) should correctly parse the snippet template`, async function () {
      const [ text, selections ] = await template2snippet(state, template, 0)
      const selectionsJson = selections.map(sel => sel.toJSON())

      strictEqual(text, expected.string, 'Expected strings to match')
      deepEqual(selectionsJson, expected.selections, 'Failed to parse template')
    })
  })
})
