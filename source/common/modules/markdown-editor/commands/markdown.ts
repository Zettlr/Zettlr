/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown Commands
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is our common collection of bold/italic/link/etc. commands
 *
 * END HEADER
 */

import { type ChangeSpec, EditorSelection } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { configField } from '../util/configuration'
import { language } from '@codemirror/language'
import { formatPandocAttributes, type ParsedPandocAttributes } from 'source/common/pandoc-util/parse-pandoc-attributes'

/**
 * Helper function that checks whether the provided target EditorView uses a
 * Markdown parser. NOTE: This checks if the provided language name is Markdown.
 * This ignores any potential nested parsers, and only checks for the primary
 * parser for the editor's contents.
 *
 * @param   {EditorView}  target  The EditorView
 *
 * @return  {boolean}             Whether the view appears to use Markdown.
 */
function viewContainsMarkdown (target: EditorView): boolean {
  return target.state.facet(language)?.name === 'markdown'
}

const urlRE = /^\[([^\]]+)\]\((.+?)\)|(((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()[\]{};:'".,<>?«»“”‘’])))|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})$/i

/**
 * Helper function that inserts links and images at the cursor position, drawing
 * on information from the clipboard where applicable.
 *
 * @param   {EditorView}      target  The target view
 * @param   {'link'|'image'}  type    Whether to insert a link or an image
 */
function insertLinkOrImage (target: EditorView, type: 'link'|'image'): void {
  const pre = type === 'image' ? '!' : ''

  navigator.clipboard.readText()
    .then(contents => {
      const url = urlRE.test(contents) ? contents : ''

      const transaction = target.state.changeByRange(({ from, to }) => {
        const title = target.state.sliceDoc(from, to)
        // Where do we need to put the cursor?
        let offset = 1
        if (title.length > 0 && url.length > 0) {
          offset = 4 + title.length + url.length
        } else if (title.length > 0 && url.length === 0) {
          offset = 3 + title.length
        }

        if (type === 'image') {
          offset++
        }

        return {
          changes: { from, to, insert: `${pre}[${title}](${url})` },
          range: EditorSelection.cursor(from + offset)
        }
      })

      target.dispatch(transaction)
    })
    .catch(err => console.error(err))
}

/**
 * Helper to insert pandoc fenced divs
 *
 * @param   {EditorView}      target        The target view
 * @param   {'link'|'image'}  attributes    Attributes to assign to the fenced div
 */
function insertPandocDiv (target: EditorView, attributes: string): void {
  const markRe = /(^\s*$)|(^:{3,}[ \t]*(?:\{[^\}]*\})?)/

  const transaction = target.state.changeByRange(range => {
    let opening: string = `::: {${attributes}}`
    let closing: string = ':::'

    const startLine = target.state.doc.lineAt(range.from)
    const endLine = target.state.doc.lineAt(range.to)

    const changes: ChangeSpec[] = []

    // If the startLine is not empty, insert a newline after the opening mark.
    if (!/^\s*$/.test(startLine.text)) {
      opening = opening + '\n'
    }

    // If the endLine is not empty, insert a newline before the closing mark
    // Or, if the start and endline are the same (and therefore empty), add a
    // newline before the closing mark so that the opening and closing marks
    // do not end up on the same line. This is done specifically for the closing
    // mark to provide better cursor placement when inserting empty divs.
    if (!/^\s*$/.test(endLine.text) || startLine.number === endLine.number) {
      closing = '\n' + closing
    }

    // If the previous line is not empty, not the first line, and does not
    // match an opening or closing mark, insert a newline before the opening
    const prevLine = target.state.doc.line(Math.max(startLine.number - 1, 1))
    if (prevLine.number > 1 && !markRe.test(prevLine.text)) {
      opening = '\n' + opening
    }

    // If the next line is not empty, and does not match an opening or closing
    // mark, insert a newline after the closing mark
    const nextLine = target.state.doc.line(Math.min(endLine.number + 1, target.state.doc.lines))
    if (!/^\s*$/.test(nextLine.text) && !markRe.test(nextLine.text)) {
      closing = closing + '\n'
    }

    changes.push({ from: startLine.from, insert: opening })
    changes.push({ from: endLine.to, insert: closing })

    // Adjust the selection range to account for the inserted content
    return { changes, range: EditorSelection.range(range.from + opening.length, range.to + opening.length) }
  })

  target.dispatch(transaction)
}

/**
 * Helper function that removes block level markup from the provided line
 *
 * @param   {string}  line  The line text
 *
 * @return  {string}        The line text without block markup
 */
function removeBlockMarkup (line: string): string {
  let match
  if ((match = /^#{1,6}\s+/.exec(line)) !== null) {
    return line.substring(match[0].length)
  } else if ((match = /^(\s{,3})>\s/.exec(line)) !== null) {
    return match[1] + line.substring(match[0].length)
  }
  return line
}

/**
 * Helper function that applies the provided block markup at all selection
 * ranges.
 *
 * @param   {EditorView}  target      The target view
 * @param   {string}      formatting  The formatting string to use
 */
function applyBlockMarkup (target: EditorView, formatting: string): void {
  const transaction = target.state.changeByRange(range => {
    const startLine = target.state.doc.lineAt(range.from).number
    const endLine = target.state.doc.lineAt(range.to).number

    const changes: ChangeSpec[] = []

    let offsetCharacters = 0

    for (let i = startLine; i <= endLine; i++) {
      // TODO: Test if this does what it should do
      const line = target.state.doc.line(i)
      const withoutBlocks = removeBlockMarkup(line.text)
      offsetCharacters += line.text.length - withoutBlocks.length + formatting.length + 1
      changes.push({ from: line.from, to: line.to, insert: formatting + ' ' + withoutBlocks })
    }

    return { changes, range: EditorSelection.range(range.from, range.to + offsetCharacters) }
  })

  target.dispatch(transaction)
}

/**
 * Helper function that surrounds the selection ranges in the target view with
 * the provided inline markup
 *
 * @param   {EditorView}  target  The target view
 * @param   {string}      start   The start markup
 * @param   {string}      end     The end markup
 */
function applyInlineMarkup (target: EditorView, start: string, end: string): void {
  const transaction = target.state.changeByRange(range => {
    const contents = target.state.sliceDoc(range.from, range.to)
    const before = target.state.sliceDoc(range.from - start.length, range.from)
    const after = target.state.sliceDoc(range.to, range.to + end.length)

    if (before === start && after === end) {
      // The user is inside inline markup which is outside the selection
      return {
        changes: {
          from: range.from - start.length,
          to: range.to + end.length,
          insert: contents
        },
        range: EditorSelection.range(
          range.from - start.length,
          range.from - start.length + contents.length
        )
      }
    } else if (contents.startsWith(start) && contents.endsWith(end)) {
      // The user is inside inline markup which is inside the selection
      return {
        changes: {
          from: range.from,
          to: range.to,
          insert: contents.substring(start.length, contents.length - end.length)
        },
        range: EditorSelection.range(
          range.from, range.from + contents.length - start.length - end.length
        )
      }
    } else if (after === end && range.empty) {
      // The cursor is just at the end of the inline formatting, so make it
      // "jump over" the characters
      return { range: EditorSelection.cursor(range.to + end.length) }
    } else {
      // There is not the given type of markup in this selection yet, so surround
      // the selection with it
      return {
        changes: { from: range.from, to: range.to, insert: start + contents + end },
        range: EditorSelection.range(
          range.from + start.length,
          range.from + start.length + contents.length
        )
      }
    }
  })

  target.dispatch(transaction)
}

/**
 * Helper function that turns the selection ranges into the provided type of
 * list type.
 *
 * @param   {EditorView}        target  The target view
 * @param   {'ul'|'ol'|'task'}  type    The list type
 */
function applyList (target: EditorView, type: 'ul'|'ol'|'task'): void {
  const transaction = target.state.changeByRange(range => {
    const startLine = target.state.doc.lineAt(range.from).number
    const endLine = target.state.doc.lineAt(range.to).number

    const changes: ChangeSpec[] = []

    let offsetCharacters = 0

    for (let i = startLine; i <= endLine; i++) {
      const line = target.state.doc.line(i)
      const withoutBlocks = removeBlockMarkup(line.text)
      const formatting = (type === 'ol') ? `${i - startLine + 1}.` : (type === 'ul') ? '*' : '- [ ]'
      offsetCharacters += line.text.length - withoutBlocks.length + formatting.length + 1
      changes.push({ from: line.from, to: line.to, insert: formatting + ' ' + withoutBlocks })
    }

    return { changes, range: EditorSelection.cursor(range.to + offsetCharacters) }
  })

  target.dispatch(transaction)
}

// BELOW FOLLOW ACTUAL COMMANDS
// ============================

/**
 * Replaces the existing selection ranges with links.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function insertLink (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  insertLinkOrImage(target, 'link')
  return true
}

/**
 * Replaces the existing selection ranges with images.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function insertImage (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  insertLinkOrImage(target, 'image')
  return true
}

/**
 * Replaces the existing selection ranges with bold formatting.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyBold (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  const markup = target.state.field(configField, false)?.boldFormatting ?? '**'
  applyInlineMarkup(target, markup, markup)
  return true
}

/**
 * Replaces the existing selection ranges with italic formatting.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyItalic (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  const markup = target.state.field(configField, false)?.italicFormatting ?? '*'
  applyInlineMarkup(target, markup, markup)
  return true
}

/**
 * Replaces the existing selection ranges with code formatting.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyCode (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyInlineMarkup(target, '`', '`')
  return true
}

/**
 * Replaces the existing selection ranges with a comment.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyComment (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyInlineMarkup(target, '<!-- ', ' -->')
  return true
}

/**
 * Applies highlighting for the selections.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyHighlight (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  const markup: string = target.state.field(configField, false)?.highlightFormatting ?? '=='

  if (markup === 'span') {
    applyPandocDivOrSpan(target, 'span', { classes: ['mark'] })
  } else {
    applyInlineMarkup(target, markup, markup)
  }

  return true
}

/**
 * Replaces the existing selection ranges with strikethrough formatting.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyStrikethrough (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyInlineMarkup(target, '~~', '~~')

  return true
}

/**
 * Inserts a horizontal rule at the main selection.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyRule (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  target.dispatch({
    changes: { from: target.state.selection.main.from, insert: '\n***\n' }
  })
  return true
}

/**
 * Turns the selection ranges into a heading level 1.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyH1 (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyBlockMarkup(target, '#')
  return true
}

/**
 * Turns the selection ranges into a heading level 2.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyH2 (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyBlockMarkup(target, '##')
  return true
}

/**
 * Turns the selection ranges into a heading level 3.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyH3 (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyBlockMarkup(target, '###')
  return true
}

/**
 * Turns the selection ranges into a heading level 4.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyH4 (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyBlockMarkup(target, '####')
  return true
}

/**
 * Turns the selection ranges into a heading level 5.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyH5 (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyBlockMarkup(target, '#####')
  return true
}

/**
 * Turns the selection ranges into a heading level 6.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyH6 (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyBlockMarkup(target, '######')
  return true
}

/**
 * Turns the selection ranges into blockquotes.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyBlockquote (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyBlockMarkup(target, '>')
  return true
}

/**
 * Turns the selection ranges into unordered lists.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyBulletList (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyList(target, 'ul')
  return true
}

/**
 * Turns the selection ranges into ordered lists.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyOrderedList (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyList(target, 'ol')
  return true
}

/**
 * Turns the selection ranges into task lists.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command was applicable
 */
export function applyTaskList (target: EditorView): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  applyList(target, 'task')
  return true
}

/**
 * Insert a fenced div or bracketed span
 *
 * @param   {EditorView}  target      The target view
 * @param   {string}      type        Whether to insert a fenced div or bracketed span
 * @param   {string}      attributes  Attributes to assign to the div
 *
 * @return  {boolean}                 Whether the command was applicable
*/
export function applyPandocDivOrSpan (target: EditorView, type: 'div'|'span', attributes: ParsedPandocAttributes): boolean {
  if (!viewContainsMarkdown(target)) {
    return false
  }

  const attributeString = formatPandocAttributes(attributes)

  if (type === 'div') {
    insertPandocDiv(target, attributeString)
    return true
  }

  if (type === 'span') {
    applyInlineMarkup(target, '[', `]{${attributeString}}`)
    return true
  }

  return false
}
