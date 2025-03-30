/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        transformSelectedText function
 * CVM-Role:        Utility function
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     A builder of `Commands` for transforming selected text.
 *
 * END HEADER
 */

import { ChangeSet, type StateCommand } from '@codemirror/state'

/**
 * Transform the supplied `text`.
 *
 * * strip duplicate spaces
 * * trim leading and trailing whitespace
 * * change the casing
 * * etc.
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The transformed text.
 */
export type TransformText = (text: string) => string

/**
 * Return a `Command` to transform selected text.
 *
 * @param   {TransformText} transform The transformation to be applied to the
 *                                    selected text.
 *
 * @return  {StateCommand}            A `Command` to transform selected text.
 */
export function transformSelectedText (transform: TransformText): StateCommand {
  return ({ state, dispatch }) => {
    if (state.selection.ranges.length === 0) {
      // when nothing is selected there's nothing to do
      return false
    }

    const changes = state.selection.ranges.reduce((change, { from, to }) => {
      const text = state.sliceDoc(from, to)

      const transformedText = transform(text)

      if (transformedText === text) {
        // when there's no change just return the existing change (if any)
        return change
      }

      const nextChange = ChangeSet.of(
        { from, to, insert: transformedText },
        state.doc.length
      )

      return change.compose(nextChange)
    }, ChangeSet.empty(state.doc.length))

    if (changes.empty) {
      // when there are no changes there's nothing to do
      return false
    }

    dispatch(state.update({ changes }))
    return true
  }
}
