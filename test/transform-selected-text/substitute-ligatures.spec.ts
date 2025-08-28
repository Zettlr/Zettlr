/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the substituteLigatures function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the substituteLigatures function.
 *
 * END HEADER
 */

import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from "assert"
import { substituteLigatures } from "../../source/common/modules/markdown-editor/commands/transforms/substitute-ligatures"
import { selectAll } from "../codemirror-test-utils/select-all"

describe("MarkdownEditor#substituteLigatures()", function () {
  const testCases = [
    {
      ligature: "\u00C6",
      substitution: "AE",
      expectedLength: 2,
    },
    {
      ligature: "Æ",
      substitution: "AE",
      expectedLength: 2,
    },
    {
      ligature: "\u00E6",
      substitution: "ae",
      expectedLength: 2,
    },
    {
      ligature: "æ",
      substitution: "ae",
      expectedLength: 2,
    },
    {
      ligature: "\u0132",
      substitution: "IJ",
      expectedLength: 2,
    },
    {
      ligature: "\u0133",
      substitution: "ij",
      expectedLength: 2,
    },
    {
      ligature: "\u0152",
      substitution: "OE",
      expectedLength: 2,
    },
    {
      ligature: "\u0153",
      substitution: "oe",
      expectedLength: 2,
    },
    {
      ligature: "\uFB00",
      substitution: "ff",
      expectedLength: 2,
    },
    {
      ligature: "\uFB01",
      substitution: "fi",
      expectedLength: 2,
    },
    {
      ligature: "\uFB02",
      substitution: "fl",
      expectedLength: 2,
    },
    {
      ligature: "\uFB03",
      substitution: "ffi",
      expectedLength: 3,
    },
    {
      ligature: "\uFB04",
      substitution: "ffl",
      expectedLength: 3,
    },
    {
      ligature: "\uFB05",
      substitution: "st",
      expectedLength: 2,
    },
    {
      ligature: "\uFB06",
      substitution: "st",
      expectedLength: 2,
    },
  ]

  testCases.forEach(({ ligature, substitution, expectedLength }) => {
    it(`substitutes ligature '${ligature}' with '${substitution}'`, function () {
      const state = EditorState.create({
        doc: ligature,
        selection: selectAll(ligature),
      })

      let wasDispatched = false

      const dispatch = (tx: Transaction) => {
        wasDispatched = true

        deepEqual(tx.changes, {
          inserted: [
            {
              length: expectedLength,
              text: [substitution],
            },
          ],
          sections: [1, expectedLength],
        })
      }

      substituteLigatures({ state, dispatch })

      strictEqual(
        wasDispatched,
        true,
        "A transaction must have been dispatched"
      )
    })
  })

  it("substitutes multiple occurrences of the same ligature", function () {
    const text = "Falstaﬀ, grab thy staﬀ and let's laﬀ."

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    let wasDispatched = false

    const dispatch = (tx: Transaction) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: 40,
            text: ["Falstaff, grab thy staff and let's laff."],
          },
        ],
        sections: [37, 40],
      })
    }

    substituteLigatures({ state, dispatch })

    strictEqual(wasDispatched, true, "A transaction must have been dispatched")
  })

  it("substitutes interleaved occurrences of different ligatures", function () {
    const text = "Falstaﬀ, grab thy waﬄes and let's laﬀ at the kerfuﬄe."

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    let wasDispatched = false

    const dispatch = (tx: Transaction) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: 59,
            text: ["Falstaff, grab thy waffles and let's laff at the kerfuffle."],
          },
        ],
        sections: [53, 59],
      })
    }

    substituteLigatures({ state, dispatch })

    strictEqual(wasDispatched, true, "A transaction must have been dispatched")
  })

  it('given text with substitutable ligatures but those ligatures are not in the selected text then no transaction is dispatched', function () {
    const text = 'Oh `laﬀ` now'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include the ligature
        EditorSelection.range(0, 2),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    substituteLigatures({ state, dispatch })
  })

  it('given text with no ligatures then no transaction is dispatched', function () {
    const text = 'There are no ligatures in this text'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    substituteLigatures({ state, dispatch })
  })
})
