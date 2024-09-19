import { detectFileIndentation } from "../../fsal/util/detect-file-indentation"
import { extractLinefeed } from "../../fsal/util/extract-linefeed"
import { normalizeLineEndings } from "../../fsal/util/normalize-line-endings"

/**
 * This function takes in a file and normalizes the file's line indentation to
 * whichever is desired. NOTE: This function will implicitly also normalize the
 * line endings of the text you provide, as it must split the file content into
 * lines for the indentation changer. It uses the same utility functions as the
 * various file loaders across the app for this.
 *
 * @param   {string}    text           The text in question
 * @param   {'\t'|' '}  newIndent      The new indent character
 * @param   {number}    newSize        The new indent size. Will be set to 1 for
 *                                     tabs.
 * @param   {'\t'|' '}  currentIndent  (Optional) Current indent. Detected
 *                                     automatically if not provided.
 * @param   {number}    currentSize    (Optional) The current indent size.
 *                                     Detected automatically if not provided.
 *
 * @return  {string}                   The text with the line indents normalized
 */
export function changeFileIndentation (text: string, newIndent: '\t'|' ', newSize: number, currentIndent?: '\t'|' ', currentSize?: number): string {
  const linefeed = extractLinefeed(text)

  const lines = normalizeLineEndings(text).split('\n')
  if (currentIndent === undefined || currentSize === undefined) {
    [ currentIndent, currentSize ] = detectFileIndentation(lines)
  }

  if (newIndent === '\t' && newSize !== 1) {
    newSize = 1 // Enforce single tabs
  }

  for (let i = 0; i < lines.length; i++) {
    // Take the current indent in multiples of current indentation size in its
    // entirety (leaving out any trailing spaces)...
    lines[i] = lines[i].replace(new RegExp(`^${currentIndent}{${currentSize}}*`), (match) => {
      // And replace them with the same amount of newIndents times newSize.
      return newIndent.repeat(newSize * Math.floor(match.length / currentSize))
    })
  }

  return lines.join(linefeed)
}
