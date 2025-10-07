import { EditorState } from '@codemirror/state'
import { template2snippet } from '../source/common/modules/markdown-editor/autocomplete/snippets'
import { configField } from '../source/common/modules/markdown-editor/util/configuration'
import { deepEqual, strictEqual } from 'assert'

const TEST_SNIPPETS = [
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
