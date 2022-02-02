/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Markdown Shortcuts
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin adds common Markdown shortcuts (bold, italic, links, etc.)
  *
  * END HEADER
  */

import { getListOrderedRE, getListTaskListRE, getListUnorderedCMRE, getUrlRE, getBlockRE } from '@common/regular-expressions'
import CodeMirror, { commands, Pass } from 'codemirror'
const clipboard = (window as any).clipboard

const unorderedListRE = getListUnorderedCMRE()
const taskListRE = getListTaskListRE()
const orderedListRE = getListOrderedRE()

const reservedChars = '+.*_/\\[](){}?^$'.split('')
const urlRE = getUrlRE()
const blockRE = getBlockRE()

/**
 * This function undoes a block formatting and then re-applies another one.
 * @param  {String} line A line with possible block formattings.
 * @param {String} formatting The formatting mark to be applied
 * @return {String}      The line without Markdown block formattings.
 */
function applyBlock (line: string, formatting: string): string {
  // Only add a space if there is a formatting passed to the function
  formatting = (formatting) ? formatting + ' ' : ''

  // Return the match, extracting the formatting.
  const match = blockRE.exec(line)
  if (match === null) {
    // Return the unaltered line if there is no block element contained
    return formatting + line
  } else {
    // Replace all whitespace between formatting mark and line contents
    return match[1] + formatting + match[2]
  }
}

/**
 * Converts selection into a markdown inline element (or removes formatting)
 *
 * @param  {CodeMirror.Editor} cm   The CodeMirror instance
 * @param  {string}            pre  The formatting mark before the element
 * @param  {string}            post The formatting mark behind the element
 */
function markdownInline (cm: CodeMirror.Editor, pre: string, post: string, tokentype?: string): void {
  // Is something selected?
  if (!cm.somethingSelected()) {
    // TODO: Check token type state at the cursor position to leave the
    // mode if already in the mode.
    let currentToken = cm.getTokenAt(cm.getCursor()).type
    if (tokentype !== undefined && currentToken !== null && currentToken?.includes(tokentype)) { // -- the tokentypes can be multiple (spell-error, e.g.)
      // We are, indeed, currently in this token. So let's check *how*
      // we are going to leave the state.
      let to = { 'line': cm.getCursor().line, 'ch': cm.getCursor().ch + post.length }
      if (cm.getRange(cm.getCursor(), to) === post) {
        cm.setCursor(to)
      } else {
        // No sign in sight -> insert it. Cursor will automatically move forward
        cm.replaceSelection(post)
      }
    } else {
      // Not in the mode -> simply do the standard.
      cm.replaceSelection(pre + '' + post, 'start')
      // Move cursor forward (to the middle of the insertion)
      const cur = cm.getCursor()
      cur.ch = cur.ch + pre.length
      cm.setCursor(cur)
    }
    return
  }

  // Build the regular expression by first escaping problematic characters
  let preregex = pre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let postregex = post.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  let re = new RegExp('^' + preregex + '.+?' + postregex + '$', 'g')

  const replacements = []
  for (const selection of cm.getSelections()) {
    if (re.test(selection)) {
      // We got something so unformat.
      replacements.push(selection.substr(pre.length, selection.length - pre.length - post.length))
    } else {
      // TODO: Check whether the user just selected the text itself and
      // not the formatting marks!

      // NOTE: Since the user can triple-click a line, that selection will
      // extend beyond the line. So check if the last char of selection is
      // a newline, and, if so, pluck that and push it after post.
      if (selection[selection.length - 1] === '\n') {
        replacements.push(pre + String(selection).substr(0, selection.length - 1) + post + '\n')
      } else {
        replacements.push(pre + selection + post)
      }
    }
  }

  // Replace with changes selections
  cm.replaceSelections(replacements, 'around')
}

/**
 * Converts a selection into a block element
 *
 * @param  {CodeMirror.Editor} cm   The codemirror instance
 * @param  {string}            mark The formatting mark to be inserted
 */
function markdownBlock (cm: CodeMirror.Editor, mark: string): void {
  // Build the regular expression
  let markregex = ''
  for (let i = 0; i < mark.length; i++) {
    if (reservedChars.includes(mark.charAt(i))) {
      markregex += '\\' + mark.charAt(i)
    } else {
      markregex += mark.charAt(i)
    }
  }
  let re = new RegExp('^' + markregex + ' (.*)$')

  // If nothing is selected we have a very short journey.
  if (!cm.somethingSelected()) {
    // Just jump to the beginning of the line and insert a mark
    let cur = cm.getCursor()
    cur.ch = 0
    let line = cm.getLineHandle(cur.line)
    const match = re.exec(line.text)
    if (match !== null) {
      // Line already contains the formatting -> remove
      cm.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
      // Replace only with the first capturing group
      cm.replaceSelection(match[1].trim())
    } else {
      // Line is not formatted -> insert a mark
      cm.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
      cm.replaceSelection(applyBlock(line.text, mark))
    }
    return // Done with formatting
  }

  // We've got at least one selection. So first get all line numbers inside
  // the selection.
  let lines = []
  for (let sel of cm.listSelections()) {
    // Anchor is greater than head if the user selected "backwards"
    let higher = (sel.anchor.line > sel.head.line) ? sel.anchor : sel.head
    let lower = (sel.anchor.line < sel.head.line) ? sel.anchor : sel.head
    for (let i = lower.line; i <= higher.line; i++) {
      lines.push(i)
    }
  }

  // Second: Unique-ify the lines array (one selection may start at a line
  // where another ends)
  lines = [...new Set(lines)]

  if (lines.length === 0) return // Nothing to do

  // Third: Convert all lines into single selections.
  let finalCursor = { 'line': 0, 'ch': 0 }
  let from
  let sel = []
  for (let no of lines) {
    from = { 'line': no, 'ch': 0 }
    finalCursor = { 'line': no, 'ch': cm.getLine(no).length }
    sel.push({ 'anchor': from, 'head': finalCursor })
  }
  cm.setSelections(sel)

  // Now traverse each selections and either apply a formatting mark or remove it
  let replacements = []

  for (let sel of cm.listSelections()) {
    let line = cm.getLine(sel.anchor.line)
    const match = re.exec(line)
    if (match !== null) {
      // Line already contains the formatting -> remove
      replacements.push(match[1].trim())
    } else {
      // Line is not formatted -> insert a mark
      replacements.push(applyBlock(line, mark))
    }
  }

  cm.replaceSelections(replacements)
  cm.setCursor(finalCursor)
}

/**
 * Toggles bold formatting
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownBold = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) return Pass
  let boldChars = (cm as any).getOption('zettlr').markdownBoldFormatting
  markdownInline(cm, boldChars, boldChars, 'strong')
}

/**
 * Toggles italic formatting
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownItalic = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  let italicChars = (cm as any).getOption('zettlr').markdownItalicFormatting
  markdownInline(cm, italicChars, italicChars, 'em')
}

/**
 * Toggles code formatting
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownCode = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownInline(cm, '`', '`', 'comment')
}

/**
 * Toggles comments
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownComment = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  // Add spaces so that the commenting out looks nicer
  markdownInline(cm, '<!-- ', ' -->', 'comment')
}

/**
 * Toggles heading level 1
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownHeading1 = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownBlock(cm, '#')
}
/**
 * Toggles heading level 2
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownHeading2 = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownBlock(cm, '##')
}
/**
 * Toggles heading level 3
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownHeading3 = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownBlock(cm, '###')
}
/**
 * Toggles heading level 4
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownHeading4 = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownBlock(cm, '####')
}
/**
 * Toggles heading level 5
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownHeading5 = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownBlock(cm, '#####')
}
/**
 * Toggles heading level 6
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownHeading6 = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownBlock(cm, '######')
}

/**
 * Toggles blockquotes
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownBlockquote = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  markdownBlock(cm, '>')
}

/**
 * Toggles a divider
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownDivider = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  if (cm.somethingSelected()) {
    cm.setCursor(cm.listSelections()[0].anchor)
  }
  cm.replaceSelection('\n***\n')
}

/**
 * Inserts a link
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownLink = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  let url = ''
  if (urlRE.test(clipboard.readText())) {
    url = clipboard.readText()
  }

  // Is something selected?
  if (!cm.somethingSelected()) {
    cm.replaceSelection(`[](${url})`, 'start')
    let cur = cm.getCursor()
    cur.ch = cur.ch + 1
    cm.setCursor(cur)
    return
  }

  // Retrieve currently selected selections
  const sel = cm.getSelections()

  // Traverse all selections and perform bolden or unbolden on them
  for (let i = 0; i < sel.length; i++) {
    // We don't need regular expressions here because we will
    // just transform the text into a Link that has to be provided with
    // an URL
    sel[i] = '[' + sel[i] + '](' + url + ')'
  }

  // Replace with changes selections
  cm.replaceSelections(sel)
}

/**
 * Inserts an image
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownImage = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  let url = ''
  if (urlRE.test(clipboard.readText())) {
    url = clipboard.readText()
  }

  // Is something selected?
  if (!cm.somethingSelected()) {
    cm.replaceSelection(`![](${url})`, 'start')
    let cur = cm.getCursor()
    cur.ch = cur.ch + 2
    cm.setCursor(cur)
    return
  }

  // Retrieve currently selected selections
  const sel = cm.getSelections()

  // Traverse all selections and perform bolden or unbolden on them
  for (let i = 0; i < sel.length; i++) {
    // We don't need regular expressions here because we will
    // just transform the text into a Link that has to be provided with
    // an URL
    sel[i] = '![' + sel[i] + '](' + url + ')'
  }

  // Replace with changes selections
  cm.replaceSelections(sel)
}

/**
 * Toggles ordered lists
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownMakeOrderedList = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  // If nothing is selected we have a very short journey.
  if (!cm.somethingSelected()) {
    // Just jump to the beginning of the line and insert a list indicator
    let cur = cm.getCursor()
    cur.ch = 0
    cm.setCursor(cur)
    let line = cm.getLineHandle(cur.line)
    if (orderedListRE.test(line.text)) {
      // Line is already ordered -> remove
      cm.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
      cm.replaceSelection(cm.getSelection().replace(orderedListRE, ''))
    } else {
      // Line is not a list -> find out whether the previous line is a list
      let num = 1
      let olSep = '.'
      let olTab = ''
      if (cur.line > 0) {
        let match = orderedListRE.exec(cm.getLineHandle(cur.line - 1).text)
        if (match !== null) {
          // Third capturing group is the actual number
          num = parseInt(match[3]) + 1
          olSep = match[4] // 4 is either . or )
          olTab = match[1] // Contains the spaces (i.e. the tab position)
        }
      }
      cm.replaceRange(olTab + num.toString() + olSep + ' ', cur)
    }
    return
  }

  // Now traverse each selections and either apply a listing or remove it
  for (let sel of cm.getSelections()) {
    if (sel.includes('\n')) {
      // First get the beginning cursor position (anchor)
      let cur = cm.getCursor('from')
      let lineFrom = cur.line
      // Second get the ending cursor position (head)
      let lineTo = cm.getCursor('to').line + 1 // eachLine will exclude the lineTo line
      // Third traverse each line between both positions and add
      // numbers to them.

      let itemNo = 1
      let olSep = '.'
      let olTab = ''
      if (cur.line > 0) {
        // Remember to get a (potential) previous number.
        let match = orderedListRE.exec(cm.getLineHandle(cur.line - 1).text)
        if (match !== null) {
          // Third capturing group is the actual number
          itemNo = parseInt(match[3]) + 1
          olSep = match[4]
          olTab = match[1]
        }
      }
      cm.eachLine(lineFrom, lineTo, (line) => {
        let no = cm.getLineNumber(line)
        if (no === null) {
          return
        }

        if (orderedListRE.test(line.text)) {
          // Line is already ordered -> remove
          cm.setCursor(no, 0)
          let curFrom = cm.getCursor()
          cm.setSelection(curFrom, { 'line': no, 'ch': line.text.length })
          cm.replaceSelection(cm.getSelection().replace(orderedListRE, ''))
        } else {
          // Just prepend item numbers
          cm.setCursor(no, 0)
          cm.replaceRange(olTab + (itemNo++).toString() + olSep + ' ', cm.getCursor())
        }
      })
    } else {
      let cur = cm.getCursor()
      cur.ch = 0
      cm.setCursor(cur)
      let num = 1
      let olSep = '.'
      let olTab = ''
      if (cur.line > 0) {
        let match = orderedListRE.exec(cm.getLineHandle(cur.line - 1).text)
        if (match !== null) {
          // Third capturing group is the actual number
          num = parseInt(match[3]) + 1
          olSep = match[4] // 4 is either . or )
          olTab = match[1] // The prepending spaces
        }
      }
      cm.replaceRange(olTab + num.toString() + olSep + ' ', cur) // Only prepend a number
    }
  }
}

/**
 * Toggles unordered lists
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownMakeUnorderedList = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  // If nothing is selected we have a very short journey.
  if (!cm.somethingSelected()) {
    // Just jump to the beginning of the line and insert a list indicator
    let cur = cm.getCursor()
    cur.ch = 0
    cm.setCursor(cur)
    let line = cm.getLineHandle(cur.line)
    if (unorderedListRE.test(line.text)) {
      // Line is already unordered -> remove
      cm.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
      cm.replaceSelection(cm.getSelection().replace(unorderedListRE, ''))
    } else {
      // Line is not a list -> Insert a bullet at cursor position
      let num = '*'
      let olTab = ''
      if (cur.line > 0) {
        let match = unorderedListRE.exec(cm.getLineHandle(cur.line - 1).text)
        if (match !== null) {
          // Third capturing group is the bullet char
          num = match[2]
          olTab = match[1] // Contains the spaces (i.e. the tab position)
        }
      }
      cm.replaceRange(olTab + num + ' ', cur)
    }
    return
  }

  // Now traverse each selections and either apply a listing or remove it
  for (let sel of cm.getSelections()) {
    if (sel.includes('\n')) {
      // First get the beginning cursor position (anchor)
      let lineFrom = cm.getCursor('from').line
      // Second get the ending cursor position (head)
      let lineTo = cm.getCursor('to').line + 1 // eachLine will exclude the lineTo line
      // Third traverse each line between both positions and add
      // bullets to them
      cm.eachLine(lineFrom, lineTo, (line) => {
        let no = cm.getLineNumber(line)
        if (no === null) {
          return
        }
        if (unorderedListRE.test(line.text)) {
          // Line is already unordered -> remove
          cm.setCursor(no, 0)
          let curFrom = cm.getCursor()
          cm.setSelection(curFrom, { 'line': no, 'ch': line.text.length })
          cm.replaceSelection(cm.getSelection().replace(unorderedListRE, ''))
        } else {
          // Just prepend bullets
          cm.setCursor(no, 0)
          cm.replaceRange('* ', cm.getCursor())
        }
      })
    } else {
      let cur = cm.getCursor()
      cur.ch = 0
      cm.setCursor(cur)
      let num = '*'
      let olTab = ''
      if (cur.line > 0) {
        let match = unorderedListRE.exec(cm.getLineHandle(cur.line - 1).text)
        if (match !== null) {
          // Third capturing group is the bullet char
          num = match[2]
          olTab = match[1] // Contains the spaces (i.e. the tab position)
        }
      }
      cm.replaceRange(olTab + num + ' ', cur)
    }
  }
}

/**
 * Toggles a task list
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
;(commands as any).markdownMakeTaskList = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  // If nothing is selected we have a very short journey.
  if (!cm.somethingSelected()) {
    // Just jump to the beginning of the line and insert a list indicator
    let cur = cm.getCursor()
    cur.ch = 0
    cm.setCursor(cur)
    let line = cm.getLineHandle(cur.line)
    if (taskListRE.test(line.text)) {
      // Line is already unordered -> remove
      cm.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
      cm.replaceSelection(cm.getSelection().replace(taskListRE, ''))
    } else {
      // Line is not a list -> Insert a task list item at cursor position
      let num = '- [ ]'
      let olTab = ''
      if (cur.line > 0) {
        let match = taskListRE.exec(cm.getLineHandle(cur.line - 1).text)
        if (match !== null) {
          // Third capturing group is the bullet char
          olTab = match[1] // Contains the spaces (i.e. the tab position)
        }
      }
      cm.replaceRange(olTab + num + ' ', cur)
    }
    return
  }

  // Now traverse each selections and either apply a listing or remove it
  for (let sel of cm.getSelections()) {
    if (sel.includes('\n')) {
      // First get the beginning cursor position (anchor)
      let lineFrom = cm.getCursor('from').line
      // Second get the ending cursor position (head)
      let lineTo = cm.getCursor('to').line + 1 // eachLine will exclude the lineTo line
      // Third traverse each line between both positions and add
      // bullets to them
      cm.eachLine(lineFrom, lineTo, (line) => {
        let no = cm.getLineNumber(line)
        if (no === null) {
          return
        }
        if (taskListRE.test(line.text)) {
          // Line is already a task item -> remove
          cm.setCursor(no, 0)
          let curFrom = cm.getCursor()
          cm.setSelection(curFrom, { 'line': no, 'ch': line.text.length })
          cm.replaceSelection(cm.getSelection().replace(taskListRE, ''))
        } else {
          // Just prepend task list items
          cm.setCursor(no, 0)
          cm.replaceRange('- [ ] ', cm.getCursor())
        }
      })
    } else {
      let cur = cm.getCursor()
      cur.ch = 0
      cm.setCursor(cur)
      let num = '- [ ]'
      let olTab = ''
      if (cur.line > 0) {
        let match = taskListRE.exec(cm.getLineHandle(cur.line - 1).text)
        if (match !== null) {
          olTab = match[1] // Contains the spaces (i.e. the tab position)
        }
      }
      cm.replaceRange(olTab + num + ' ', cur)
    }
  }
}
