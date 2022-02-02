/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror line indentation hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Tobias Diez
 * License:         GNU GPL v3
 *
 * Description:     Indents wrapped lines in such a way that they visually align.
 *
 * END HEADER
 */

import CodeMirror, { LineHandle } from 'codemirror'

/**
 * Holds the width of a monospace space character
 *
 * @var {Number}
 */
let monospaceWidth = 0

/**
 * Holds the width of a non-monospace space character
 *
 * @var {Number}
 */
let nonMonospaceWidth = 0

/**
 * Adds an event listener to indent soft-wrapped lines (e.g. blockquotes, list items)
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance to attach
 */
export function indentLinesHook (cm: CodeMirror.Editor): void {
  cm.on('renderLine', indentLine)
}

/**
 * Clears the cached values for the line indentation
 */
export function clearLineIndentationCache (): void {
  // Reset cached widths
  monospaceWidth = 0
  nonMonospaceWidth = 0
}

/**
 * Computes the width of a character in monospace font
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance to use
 *
 * @return  {number}          The measured width in pixels
 */
function computeMonospaceWidth (cm: CodeMirror.Editor): number {
  if (monospaceWidth === 0) {
    monospaceWidth = measureCharWidth(cm, 'measureMonoWidth')
  }
  return monospaceWidth
}

/**
* Computes and returns the width of a character in the monospace font in pixels.
*/
/**
 * Computes the width of a space in monospace font
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance to use
 *
 * @return  {number}      The measured width in pixels
 */
function computeNonMonospaceWidth (cm: CodeMirror.Editor): number {
  if (nonMonospaceWidth === 0) {
    nonMonospaceWidth = measureCharWidth(cm, 'measureWidth')
  }
  return nonMonospaceWidth
}

/**
 * Computes the width of a character which is placed in a (new) node with the given ID
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance to use
 * @param   {string}  id  The ID to use
 *
 * @return  {number}      The measured width in pixels
 * @see https://stackoverflow.com/a/118251/873661
 */
function measureCharWidth (cm: CodeMirror.Editor, id: string): number {
  // Idea: Create a span containing a space and measure its size
  // Infact, We use 100 characters in order to get an approximately correct width (clientWidth is an integer)
  const container = document.createElement('div')
  container.id = id
  container.innerHTML = '<span>' + '&nbsp'.repeat(100) + '</span>'
  cm.getWrapperElement().appendChild(container)
  const width = (container.clientWidth + 1) / 100
  cm.getWrapperElement().removeChild(container)
  return width
}

/**
 * Indents the given line elt on the cm instance
 *
 * @param   {CodeMirror.Editor}  cm    The instance
 * @param   {LineHandle}  line  The line handle
 * @param   {HTMLElement}     elt   The DOM element of the line
 */
function indentLine (cm: CodeMirror.Editor, line: LineHandle, elt: HTMLElement): void {
  // Disable on non-Markdown text
  const idx = cm.getLineNumber(line)
  if (idx === null || cm.getModeAt({ line: idx, ch: 0 }).name !== 'markdown-zkn') {
    return
  }

  // Need to calculate indent and padding in order to provide a proper hanging indent
  // Originally based on https://discuss.codemirror.net/t/hanging-indent/243/2
  const monospaceWidth = computeMonospaceWidth(cm)
  const nonMonospaceWidth = computeNonMonospaceWidth(cm)

  // Determine everything before the meaningful text begins. This will match the following:
  //     Text indentended by 4 (or any number of) spaces
  //     - List indented by 4 (or any number of) spaces
  // - List non-indented
  //   - - - - - Some text here (will only match first hyphen)
  const match = /^(?<spaces>\s*)(?<ordinal>[*+-]\s+|\d+[.)]\s+|>\s*)?/.exec(line.text)

  if (match === null) {
    return // No need to indent
  }

  // Extract full match, leading spaces and an optional ordinal
  const padding = match[1]
  const ordinal = match[2] ?? ''

  // The following code is a bit complicated as the as the HTML structure
  // is the following:
  //  - some spaces or tabs in normal font (length = numberOfSpaces)
  //  - the sequence "- " or "1. " in monospaced font (length = numberOfOrdinal)
  //  - text in normal font

  // Tabs are another story. They are inserted as spans with class "cm-tab"
  // and consequently change the layout again. The following tries to align
  // tab-indented list with space-indented lists (works quite ok at least
  // on the first level)
  const numberOfTabs = (padding.match(/\t/g) ?? []).length
  const numberOfSpaces = padding.length - numberOfTabs
  const numberOfOrdinal = ordinal.length

  // The following is a funny bug: If we don't add that amount back to the
  // paddingLeft of the line element, any selection on that element will be
  // left-padded by exactly 4 pixels. This fix of simply adding 4 pixels
  // surprisingly works on any font (monospace, serif, sans-serif) as well
  // as on all zoom levels. I have no idea why this happens. If someone
  // finds the cause, please shoot me a few lines!
  const selectionLeftPadFix = 4

  elt.style.textIndent = `-${numberOfSpaces * nonMonospaceWidth + numberOfOrdinal * monospaceWidth}px`
  elt.style.paddingLeft = `${numberOfSpaces * nonMonospaceWidth + numberOfOrdinal * monospaceWidth + selectionLeftPadFix}px`
}
