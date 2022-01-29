/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror footnotes hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables preview & inline-editing of footnotes.
 *
 * END HEADER
 */

// This is a plugin that needs a specific CodeMirror instance to work, hence
// it's not in the plugins folder.

import tippy from 'tippy.js'
import md2html from '@common/util/md-to-html'
import { trans } from '@common/i18n-renderer'
import CodeMirror from 'codemirror'

/**
 * No footnote tooltips while we're editing a footnote
 *
 * @var {boolean}
 */
let isEditingFootnote = false

export default function footnotesHook (cm: CodeMirror.Editor): void {
  // Hook into click events
  cm.getWrapperElement().addEventListener('click', (event) => {
    // Open links on both Cmd and Ctrl clicks - otherwise stop handling event
    if (process.platform === 'darwin' && !event.metaKey) {
      return true
    }

    if (process.platform !== 'darwin' && !event.ctrlKey) {
      return true
    }

    if (event.target === null) {
      return true
    }

    const cursor = cm.coordsChar({ left: event.clientX, top: event.clientY })

    if (Boolean(cm.isReadOnly()) || cm.getModeAt(cursor).name !== 'markdown-zkn') {
      return true
    }

    const tokenInfo = cm.getTokenAt(cursor)

    if (tokenInfo.type === null) {
      return
    }

    const tokenList = tokenInfo.type.split(' ')
    const startsWithCirc = (event.target as HTMLSpanElement).textContent?.startsWith('^') ?? false

    // A link (reference) that starts with a cironflex is a footnote
    if (Boolean(tokenList.includes('link')) && startsWithCirc) {
      event.preventDefault()
      ;(event as any).codemirrorIgnore = true
      editFootnote(cm, event.target as HTMLElement)
    }
  })

  // Hook into mousemove events to show a footnote tooltip
  cm.getWrapperElement().addEventListener('mousemove', (e) => {
    const target = e.target as HTMLElement
    const isLink = target.classList.contains('cm-link')
    const startsWithCircumflex = target.textContent?.indexOf('^') === 0
    if (isLink && startsWithCircumflex) {
      showFootnoteTooltip(cm, target)
    }
  })
}

/**
 * Displays a tooltip containing the footnote text
 *
 * @param   {CodeMirror} cm       The CodeMirror instance
 * @param   {Element}    element  The DOM element to center on
 */
function showFootnoteTooltip (cm: CodeMirror.Editor, element: HTMLElement): void {
  // First let us see if there is already a tippy-instance bound to this.
  // If so, we can abort now.
  if (element.hasOwnProperty('_tippy')) {
    return
  }

  if (isEditingFootnote) {
    return
  }

  // Because we highlight the formatting as well, the element's text will
  // only contain ^<id> without the brackets
  const ref = element.textContent?.substring(1) ?? ''
  const fnref = getFootnoteTextForRef(cm, ref)

  tippy(element, {
    // Display the text as HTML
    content: (fnref !== undefined && fnref.trim() !== '') ? md2html(fnref) : md2html('_' + trans('gui.no_reference_message') + '_'),
    allowHTML: true,
    onHidden (instance) {
      instance.destroy() // Destroy the tippy instance.
    },
    arrow: true,
    interactive: true, // Enable clicking on links, etc.
    appendTo: document.body // Necessary because these tippys are interactive
  }).show() // Immediately show the tooltip
}

/**
 * Displays a small textarea to edit footnote text
 *
 * @param   {CodeMirror} cm       The CodeMirror instance
 * @param   {Element}    element  The target element
 */
function editFootnote (cm: CodeMirror.Editor, element: HTMLElement): void {
  const ref = element.textContent?.substring(1) ?? ''
  const fnText = getFootnoteTextForRef(cm, ref)

  if (fnText === undefined) {
    return // There was no matching reference
  }

  const textArea = document.createElement('textarea')
  textArea.classList.add('editor-fn-textarea') // Defined in ../editor.less
  textArea.textContent = fnText

  isEditingFootnote = true

  // Now we either got a match or an empty fnref. So create a tippy
  // instance
  const tippyInstance = tippy(element, {
    content: textArea,
    allowHTML: true,
    // Allow the user to move the cursor around quite a bit
    interactiveBorder: 600,
    showOnCreate: true,
    onHidden (instance) {
      isEditingFootnote = false
      instance.destroy() // Destroy the tippy instance.
    },
    arrow: true,
    interactive: true, // Enable clicking on links, etc.
    appendTo: document.body, // Necessary because these tippys are interactive
    trigger: 'manual'
  })

  textArea.focus()
  textArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Done editing.
      e.preventDefault()
      setFootnoteTextForRef(cm, ref, textArea.value)
      tippyInstance.hide()
    }
  })
}

/**
 * Retrieves the text for the given footnote reference.
 *
 * @param   {CodeMirror}        cm   The CodeMirror instance
 * @param   {string}            ref  The reference
 *
 * @return  {undefined|string}       Either undefined or the text.
 */
function getFootnoteTextForRef (cm: CodeMirror.Editor, ref: string): string|undefined {
  const range = getFnTextRange(cm, ref)
  if (range === undefined) {
    return undefined
  }

  const text = cm.getRange(range.from, range.to)

  // Now we have the complete text. However, the text will still be indented,
  // if it's a multi-line footnote, so we have to remove any excess indentation
  // from the footnote text, which is especially important to not have sudden
  // code blocks in the footnote text.
  const lines = text.split(/\r\n|\n\r|\n/).map((line, idx) => {
    if (idx === 0) {
      return line
    } else {
      // Remove exactly four spaces at the beginning of the line
      return line.replace(/^\s{4}/, '')
    }
  })

  return lines.join('\n')
}

/**
 * Sets the given string as the content for the given footnote reference.
 *
 * @param   {CodeMirror}  cm        The CodeMirror instance
 * @param   {string}      ref       The reference to set the text for
 * @param   {string}      newValue  The text to apply.
 */
function setFootnoteTextForRef (cm: CodeMirror.Editor, ref: string, newValue: string): void {
  const range = getFnTextRange(cm, ref)
  if (range === undefined) {
    return console.warn(`Could not set footnote text for reference ${ref}: No matching text for the reference found.`)
  }

  // We have to prepare the text to be added in such a way that all lines except
  // the first one are indented by four _additional_ spaces.
  const lines = newValue.split(/\r\n|\n\r|\n/).map((line, idx) => {
    if (idx === 0) {
      return line
    } else if (line.trim() === '') {
      // It's good practice to keep empty lines actually empty.
      return ''
    } else {
      return '    ' + line
    }
  })

  cm.replaceRange(lines.join('\n'), range.from, range.to)
}

/**
 * Retrieves the range as a from, to-object where the text for the given footnote
 * reference resides.
 *
 * @param   {CodeMirror}  cm   The CodeMirror instance
 * @param   {string}      ref  The reference to extract the range from
 *
 * @return  {undefined|{ from: { line: number, ch: number }, to: { line: number, ch: number } }}  Either undefined or the range
 */
function getFnTextRange (cm: CodeMirror.Editor, ref: string): CodeMirror.MarkerRange|undefined {
  const lines = String(cm.getValue()).split(/\r\n|\n\r|\n/)

  const from = { line: 0, ch: 0 }

  const to = {
    line: lines.length - 1,
    ch: lines[lines.length - 1].length
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`[^${ref}]:`)) {
      // We have found the beginning of the footnote text: extract the position.
      from.line = i
      from.ch = 5 + ref.length
    } else if (from.ch > 0) {
      // If we're in this if, we have already found the first line of the
      // footnote reference. However, it could be a multi-line/paragraph
      // footnote, in which case we need to extract more. As the Pandoc
      // documentation states, as long as the following paragraphs are indented,
      // they will be count towards the footnote.

      const isEmpty = lines[i].trim() === ''
      const isIndented = /^\s{4,}\S+/.test(lines[i])
      const isPreviousLineEmpty = i > 0 && lines[i - 1].trim() === ''
      const isAnotherFootnote = /^\[\^[^\]]+\]:/.test(lines[i])

      if ((!isEmpty && !isIndented && isPreviousLineEmpty) || isAnotherFootnote) {
        // The line is neither empty, nor correctly indented, so stop searching.
        to.line = i - 2 // -2 because of `isPreviousLineEmpty`, which we must exclude
        to.ch = lines[i - 2].length
        break
      }
    }
  }

  if (from.line === 0 && from.ch === 0) {
    return undefined
  } else {
    return { from, to }
  }
}
