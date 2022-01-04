/* global define CodeMirror */
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

const clipboard = window.clipboard
const {
  getListOrderedRE,
  getListTaskListRE,
  getListUnorderedCMRE,
  getUrlRE,
  getBlockRE
} = require('@common/regular-expressions');

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

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
  function applyBlock (line, formatting) {
    // Only add a space if there is a formatting passed to the function
    formatting = (formatting) ? formatting + ' ' : ''

    // Return the unaltered line if there is no block element contained
    if (!blockRE.test(line)) return formatting + line

    // Return the match, extracting the formatting.
    let match = blockRE.exec(line)
    // Replace all whitespace between formatting mark and line contents
    return match[1] + formatting + match[2]
  }

  /**
   * Converts selection into a markdown inline element (or removes formatting)
   *
   * @param  {CodeMirror.Editor} cm   The CodeMirror instance
   * @param  {string}            pre  The formatting mark before the element
   * @param  {string}            post The formatting mark behind the element
   */
  function markdownInline (cm, pre, post, tokentype = undefined) {
    // Is something selected?
    if (!cm.somethingSelected()) {
      // TODO: Check token type state at the cursor position to leave the
      // mode if already in the mode.
      let currentToken = cm.getTokenAt(cm.getCursor()).type
      if (currentToken != null && (currentToken.indexOf(tokentype) > -1)) { // -- the tokentypes can be multiple (spell-error, e.g.)
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
        cm.doc.replaceSelection(pre + '' + post, 'start')
        // Move cursor forward (to the middle of the insertion)
        let cur = cm.doc.getCursor()
        cur.ch = cur.ch + pre.length
        cm.doc.setCursor(cur)
      }
      return
    }

    // Build the regular expression by first escaping problematic characters
    let preregex = pre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let postregex = post.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    let re = new RegExp('^' + preregex + '.+?' + postregex + '$', 'g')

    const replacements = []
    for (const selection of cm.doc.getSelections()) {
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
    cm.doc.replaceSelections(replacements, 'around')
  }

  /**
   * Converts a selection into a block element
   *
   * @param  {CodeMirror.Editor} cm   The codemirror instance
   * @param  {string}            mark The formatting mark to be inserted
   */
  function markdownBlock (cm, mark) {
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
      let line = cm.doc.getLineHandle(cur.line)
      if (re.test(line.text)) {
        let match = re.exec(line.text)

        // Line already contains the formatting -> remove
        cm.doc.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
        // Replace only with the first capturing group
        cm.doc.replaceSelection(match[1].trim())
      } else {
        // Line is not formatted -> insert a mark
        cm.doc.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
        cm.doc.replaceSelection(applyBlock(line.text, mark))
      }
      return // Done with formatting
    }

    // We've got at least one selection. So first get all line numbers inside
    // the selection.
    let lines = []
    for (let sel of cm.doc.listSelections()) {
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
      finalCursor = { 'line': no, 'ch': cm.doc.getLine(no).length }
      sel.push({ 'anchor': from, 'head': finalCursor })
    }
    cm.doc.setSelections(sel)

    // Now traverse each selections and either apply a formatting mark or remove it
    let replacements = []

    for (let sel of cm.doc.listSelections()) {
      let line = cm.doc.getLine(sel.anchor.line)
      if (re.test(line)) {
        let match = re.exec(line)
        // Line already contains the formatting -> remove
        replacements.push(match[1].trim())
      } else {
        // Line is not formatted -> insert a mark
        replacements.push(applyBlock(line, mark))
      }
    }

    cm.doc.replaceSelections(replacements)
    cm.doc.setCursor(finalCursor)
  }

  /**
   * Toggles bold formatting
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownBold = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    let boldChars = cm.getOption('zettlr').markdownBoldFormatting
    markdownInline(cm, boldChars, boldChars, 'strong')
  }

  /**
   * Toggles italic formatting
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownItalic = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    let italicChars = cm.getOption('zettlr').markdownItalicFormatting
    markdownInline(cm, italicChars, italicChars, 'em')
  }

  /**
   * Toggles code formatting
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownCode = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownInline(cm, '`', '`', 'comment')
  }

  /**
   * Toggles comments
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownComment = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    // Add spaces so that the commenting out looks nicer
    markdownInline(cm, '<!-- ', ' -->', 'comment')
  }

  /**
   * Toggles heading level 1
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownHeading1 = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownBlock(cm, '#')
  }
  /**
   * Toggles heading level 2
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownHeading2 = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownBlock(cm, '##')
  }
  /**
   * Toggles heading level 3
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownHeading3 = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownBlock(cm, '###')
  }
  /**
   * Toggles heading level 4
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownHeading4 = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownBlock(cm, '####')
  }
  /**
   * Toggles heading level 5
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownHeading5 = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownBlock(cm, '#####')
  }
  /**
   * Toggles heading level 6
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownHeading6 = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownBlock(cm, '######')
  }

  /**
   * Toggles blockquotes
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownBlockquote = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    markdownBlock(cm, '>')
  }

  /**
   * Toggles a divider
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownDivider = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass

    if (cm.somethingSelected()) {
      cm.doc.setCursor(cm.doc.listSelections()[0].anchor)
    }
    cm.doc.replaceSelection('\n***\n')
  }

  /**
   * Inserts a link
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownLink = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass

    let url = ''
    if (urlRE.test(clipboard.readText())) {
      url = clipboard.readText()
    }

    // Is something selected?
    if (!cm.somethingSelected()) {
      cm.doc.replaceSelection(`[](${url})`, 'start')
      let cur = cm.doc.getCursor()
      cur.ch = cur.ch + 1
      cm.doc.setCursor(cur)
      return
    }

    // Retrieve currently selected selections
    const sel = cm.doc.getSelections()

    // Traverse all selections and perform bolden or unbolden on them
    for (let i = 0; i < sel.length; i++) {
      // We don't need regular expressions here because we will
      // just transform the text into a Link that has to be provided with
      // an URL
      sel[i] = '[' + sel[i] + '](' + url + ')'
    }

    // Replace with changes selections
    cm.doc.replaceSelections(sel)
  }

  /**
   * Inserts an image
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownImage = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass

    let url = ''
    if (urlRE.test(clipboard.readText())) {
      url = clipboard.readText()
    }

    // Is something selected?
    if (!cm.somethingSelected()) {
      cm.doc.replaceSelection(`![](${url})`, 'start')
      let cur = cm.doc.getCursor()
      cur.ch = cur.ch + 2
      cm.doc.setCursor(cur)
      return
    }

    // Retrieve currently selected selections
    const sel = cm.doc.getSelections()

    // Traverse all selections and perform bolden or unbolden on them
    for (let i = 0; i < sel.length; i++) {
      // We don't need regular expressions here because we will
      // just transform the text into a Link that has to be provided with
      // an URL
      sel[i] = '![' + sel[i] + '](' + url + ')'
    }

    // Replace with changes selections
    cm.doc.replaceSelections(sel)
  }

  /**
   * Toggles ordered lists
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownMakeOrderedList = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass

    // If nothing is selected we have a very short journey.
    if (!cm.somethingSelected()) {
      // Just jump to the beginning of the line and insert a list indicator
      let cur = cm.getCursor()
      cur.ch = 0
      cm.setCursor(cur)
      let line = cm.doc.getLineHandle(cur.line)
      if (orderedListRE.test(line.text)) {
        // Line is already ordered -> remove
        cm.doc.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
        cm.doc.replaceSelection(cm.doc.getSelection().replace(orderedListRE, ''))
      } else {
        // Line is not a list -> find out whether the previous line is a list
        let num = 1
        let olSep = '.'
        let olTab = ''
        if (cur.line > 0) {
          let match = orderedListRE.exec(cm.doc.getLineHandle(cur.line - 1).text)
          if (match) {
            // Third capturing group is the actual number
            num = parseInt(match[3]) + 1
            olSep = match[4] // 4 is either . or )
            olTab = match[1] // Contains the spaces (i.e. the tab position)
          }
        }
        cm.doc.replaceRange(olTab + num + olSep + ' ', cur)
      }
      return
    }

    // Now traverse each selections and either apply a listing or remove it
    for (let sel of cm.doc.getSelections()) {
      if (sel.indexOf('\n') > -1) {
        // First get the beginning cursor position (anchor)
        let cur = cm.doc.getCursor('from')
        let lineFrom = cur.line
        // Second get the ending cursor position (head)
        let lineTo = cm.doc.getCursor('to').line + 1 // eachLine will exclude the lineTo line
        // Third traverse each line between both positions and add
        // numbers to them.

        let itemNo = 1
        let olSep = '.'
        let olTab = ''
        if (cur.line > 0) {
          // Remember to get a (potential) previous number.
          let match = orderedListRE.exec(cm.doc.getLineHandle(cur.line - 1).text)
          if (match) {
            // Third capturing group is the actual number
            itemNo = parseInt(match[3]) + 1
            olSep = match[4]
            olTab = match[1]
          }
        }
        cm.doc.eachLine(lineFrom, lineTo, (line) => {
          let no = line.lineNo()
          if (orderedListRE.test(line.text)) {
            // Line is already ordered -> remove
            cm.doc.setCursor(no, 0)
            let curFrom = cm.doc.getCursor()
            cm.doc.setSelection(curFrom, { 'line': no, 'ch': line.text.length })
            cm.doc.replaceSelection(cm.doc.getSelection().replace(orderedListRE, ''))
          } else {
            // Just prepend item numbers
            cm.doc.setCursor(no, 0)
            cm.doc.replaceRange(olTab + (itemNo++) + olSep + ' ', cm.doc.getCursor())
          }
        })
      } else {
        let cur = cm.doc.getCursor()
        cur.ch = 0
        cm.doc.setCursor(cur)
        let num = 1
        let olSep = '.'
        let olTab = ''
        if (cur.line > 0) {
          let match = orderedListRE.exec(cm.doc.getLineHandle(cur.line - 1).text)
          if (match) {
            // Third capturing group is the actual number
            num = parseInt(match[3]) + 1
            olSep = match[4] // 4 is either . or )
            olTab = match[1] // The prepending spaces
          }
        }
        cm.doc.replaceRange(olTab + num + olSep + ' ', cur) // Only prepend a number
      }
    }
  }

  /**
   * Toggles unordered lists
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownMakeUnorderedList = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass

    // If nothing is selected we have a very short journey.
    if (!cm.somethingSelected()) {
      // Just jump to the beginning of the line and insert a list indicator
      let cur = cm.getCursor()
      cur.ch = 0
      cm.setCursor(cur)
      let line = cm.doc.getLineHandle(cur.line)
      if (unorderedListRE.test(line.text)) {
        // Line is already unordered -> remove
        cm.doc.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
        cm.doc.replaceSelection(cm.doc.getSelection().replace(unorderedListRE, ''))
      } else {
        // Line is not a list -> Insert a bullet at cursor position
        let num = '*'
        let olTab = ''
        if (cur.line > 0) {
          let match = unorderedListRE.exec(cm.doc.getLineHandle(cur.line - 1).text)
          if (match) {
            // Third capturing group is the bullet char
            num = match[2]
            olTab = match[1] // Contains the spaces (i.e. the tab position)
          }
        }
        cm.doc.replaceRange(olTab + num + ' ', cur)
      }
      return
    }

    // Now traverse each selections and either apply a listing or remove it
    for (let sel of cm.doc.getSelections()) {
      if (sel.indexOf('\n') > -1) {
        // First get the beginning cursor position (anchor)
        let lineFrom = cm.doc.getCursor('from').line
        // Second get the ending cursor position (head)
        let lineTo = cm.doc.getCursor('to').line + 1 // eachLine will exclude the lineTo line
        // Third traverse each line between both positions and add
        // bullets to them
        cm.doc.eachLine(lineFrom, lineTo, (line) => {
          let no = line.lineNo()
          if (unorderedListRE.test(line.text)) {
            // Line is already unordered -> remove
            cm.doc.setCursor(no, 0)
            let curFrom = cm.doc.getCursor()
            cm.doc.setSelection(curFrom, { 'line': no, 'ch': line.text.length })
            cm.doc.replaceSelection(cm.doc.getSelection().replace(unorderedListRE, ''))
          } else {
            // Just prepend bullets
            cm.doc.setCursor(no, 0)
            cm.doc.replaceRange('* ', cm.doc.getCursor())
          }
        })
      } else {
        let cur = cm.doc.getCursor()
        cur.ch = 0
        cm.doc.setCursor(cur)
        let num = '*'
        let olTab = ''
        if (cur.line > 0) {
          let match = unorderedListRE.exec(cm.doc.getLineHandle(cur.line - 1).text)
          if (match) {
            // Third capturing group is the bullet char
            num = match[2]
            olTab = match[1] // Contains the spaces (i.e. the tab position)
          }
        }
        cm.doc.replaceRange(olTab + num + ' ', cur)
      }
    }
  }

  /**
   * Toggles a task list
   *
   * @param   {CodeMirror.Editor}  cm  The editor instance
   */
  CodeMirror.commands.markdownMakeTaskList = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass

    // If nothing is selected we have a very short journey.
    if (!cm.somethingSelected()) {
      // Just jump to the beginning of the line and insert a list indicator
      let cur = cm.getCursor()
      cur.ch = 0
      cm.setCursor(cur)
      let line = cm.doc.getLineHandle(cur.line)
      if (taskListRE.test(line.text)) {
        // Line is already unordered -> remove
        cm.doc.setSelection(cur, { 'line': cur.line, 'ch': line.text.length })
        cm.doc.replaceSelection(cm.doc.getSelection().replace(taskListRE, ''))
      } else {
        // Line is not a list -> Insert a task list item at cursor position
        let num = '- [ ]'
        let olTab = ''
        if (cur.line > 0) {
          let match = taskListRE.exec(cm.doc.getLineHandle(cur.line - 1).text)
          if (match) {
            // Third capturing group is the bullet char
            olTab = match[1] // Contains the spaces (i.e. the tab position)
          }
        }
        cm.doc.replaceRange(olTab + num + ' ', cur)
      }
      return
    }

    // Now traverse each selections and either apply a listing or remove it
    for (let sel of cm.doc.getSelections()) {
      if (sel.indexOf('\n') > -1) {
        // First get the beginning cursor position (anchor)
        let lineFrom = cm.doc.getCursor('from').line
        // Second get the ending cursor position (head)
        let lineTo = cm.doc.getCursor('to').line + 1 // eachLine will exclude the lineTo line
        // Third traverse each line between both positions and add
        // bullets to them
        cm.doc.eachLine(lineFrom, lineTo, (line) => {
          let no = line.lineNo()
          if (taskListRE.test(line.text)) {
            // Line is already a task item -> remove
            cm.doc.setCursor(no, 0)
            let curFrom = cm.doc.getCursor()
            cm.doc.setSelection(curFrom, { 'line': no, 'ch': line.text.length })
            cm.doc.replaceSelection(cm.doc.getSelection().replace(taskListRE, ''))
          } else {
            // Just prepend task list items
            cm.doc.setCursor(no, 0)
            cm.doc.replaceRange('- [ ] ', cm.doc.getCursor())
          }
        })
      } else {
        let cur = cm.doc.getCursor()
        cur.ch = 0
        cm.doc.setCursor(cur)
        let num = '- [ ]'
        let olTab = ''
        if (cur.line > 0) {
          let match = taskListRE.exec(cm.doc.getLineHandle(cur.line - 1).text)
          if (match) {
            olTab = match[1] // Contains the spaces (i.e. the tab position)
          }
        }
        cm.doc.replaceRange(olTab + num + ' ', cur)
      }
    }
  }
})
