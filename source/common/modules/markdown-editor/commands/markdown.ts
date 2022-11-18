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

import { ChangeSpec, EditorSelection } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { configField } from '../util/configuration'

const clipboard = window.clipboard

const urlRE = /^\[([^\]]+)\]\((.+?)\)|(((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()[\]{};:'".,<>?«»“”‘’])))|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})$/i

function insertLinkOrImage (target: EditorView, type: 'link'|'image'): void {
  const pre = type === 'image' ? '!' : ''

  const contents = clipboard.readText()
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
}

function removeBlockMarkup (line: string): string {
  let match
  if ((match = /^#{1,6}\s+/.exec(line)) !== null) {
    return line.substring(match[0].length)
  } else if ((match = /^(\s{,3})>\s/.exec(line)) !== null) {
    return match[1] + line.substring(match[0].length)
  }
  return line
}

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

    return { changes, range: EditorSelection.range(range.from, range.to + offsetCharacters) }
  })

  target.dispatch(transaction)
}

export function insertLink (target: EditorView): boolean {
  insertLinkOrImage(target, 'link')
  return true
}

export function insertImage (target: EditorView): boolean {
  insertLinkOrImage(target, 'image')
  return true
}

export function applyBold (target: EditorView): boolean {
  const markup = target.state.field(configField).boldFormatting
  applyInlineMarkup(target, markup, markup)
  return true
}

export function applyItalic (target: EditorView): boolean {
  const markup = target.state.field(configField).italicFormatting
  applyInlineMarkup(target, markup, markup)
  return true
}

export function applyCode (target: EditorView): boolean {
  applyInlineMarkup(target, '`', '`')
  return true
}

export function applyComment (target: EditorView): boolean {
  applyInlineMarkup(target, '<!-- ', ' -->')
  return true
}

export function applyRule (target: EditorView): boolean {
  target.dispatch({
    changes: { from: target.state.selection.main.from, insert: '\n***\n' }
  })
  return true
}

export function applyH1 (target: EditorView): boolean {
  applyBlockMarkup(target, '#')
  return true
}
export function applyH2 (target: EditorView): boolean {
  applyBlockMarkup(target, '##')
  return true
}
export function applyH3 (target: EditorView): boolean {
  applyBlockMarkup(target, '###')
  return true
}
export function applyH4 (target: EditorView): boolean {
  applyBlockMarkup(target, '####')
  return true
}
export function applyH5 (target: EditorView): boolean {
  applyBlockMarkup(target, '#####')
  return true
}
export function applyH6 (target: EditorView): boolean {
  applyBlockMarkup(target, '######')
  return true
}

export function applyBlockquote (target: EditorView): boolean {
  applyBlockMarkup(target, '>')
  return true
}

export function applyBulletList (target: EditorView): boolean {
  applyList(target, 'ul')
  return true
}

export function applyOrderedList (target: EditorView): boolean {
  applyList(target, 'ol')
  return true
}

export function applyTaskList (target: EditorView): boolean {
  applyList(target, 'task')
  return true
}
