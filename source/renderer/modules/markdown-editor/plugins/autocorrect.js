/* global define CodeMirror */
/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        AutoCorrect CodeMirror Plugin
  * CVM-Role:        <none>
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin adds commonly known AutoCorrect functionality
  *                  to CodeMirror, which will behave either like the one found
  *                  in Word or the one in LibreOffice. It provides a lot of
  *                  customisation, which you can find below.
  *
  * END HEADER
  */

/**
 * HOW TO USE THIS PLUGIN // OPTIONS
 *
 * All options are held within the autoCorrect-key in the CodeMirror options,
 * so you can change it at runtime by executing cm.setOption("autoCorrect", newValue)
 *
 * autoCorrect = false
 *     If autoCorrect is set to a falsy value, AutoCorrect will be deactivated.
 *
 * autoCorrect = { key: "value" }
 *     If the option is a simple key-value-object, the plugin assumes this to be
 *     the replacement table and sets the "style" and "quotes"-keys to their
 *     default values.
 *
 * The autoCorrect option can have three keys:
 *
 * autoCorrect.replacements | Object ({ key: "value" }) | Default: {}
 *     Defines the replacement table. If not present, you can still
 *     use Magic Quotes.
 *
 * autoCorrect.style | string ('LibreOffice' or 'Word') | Default: 'Word'
 *     Sets the mode to either Word or LibreOffice (see below for an explanation)
 *
 * autoCorrect.quotes | Object | Default: false
 *     This key should hold an object with two keys, "single" and "double", each
 *     with the keys 'start' and 'end'. If any of these keys is missing, quotes
 *     will fall back to default.
 */

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

  var startChars = ' ([{-–—'

  // This variable holds the generated keymap
  // that triggers the plugin's functionality
  var builtKeyMap

  // This variable holds the magic quotes
  var quotes = false

  // This variable holds the replacement table
  var replacementCandidates

  // Do we use Word-style AutoCorrect, or LibreOffice?
  // Difference: Word triggers on the last character of
  // a replacement candidate, while LibreOffice requires
  // the use of space/enter.
  var wordStyleAutoCorrect = true

  // This variable will be set to true after a replacement
  // has taken place. As long as it's true, handleBackspace
  // will reverse a replacement by looking up the table
  // backwards. As soon as a special character (Space or
  // Enter) is used, the variable will be set to false again.
  var canPerformReverseReplacement = false

  // This variable will be true once a reverse replacement has
  // taken place to prevent special characters (space/enter)
  // from simply re-replacing the characters again, which would
  // lead to an infinite loop.
  var hasJustPerformedReverseReplacement = false

  // This variable will be true if the user just typed in a quote (' or ") and
  // MagicQuotes has inserted a special one. If set, the user can press
  // backspace immediately to insert a "normal" quote instead.
  var hasJustAddedQuote = false

  // Define the autocorrect option
  CodeMirror.defineOption('autoCorrect', false, onOptionChange)

  /**
   * Triggers on option change and (re-)sets up the AutoCorrect.
   * @param {CodeMirror} cm The calling CodeMirror instance
   * @param {Mixed} value The new autoCorrect value
   * @param {Mixed} oldValue The previous autoCorrect value
   */
  function onOptionChange (cm, value, oldValue) {
    if (oldValue && oldValue !== CodeMirror.Init) cm.removeKeyMap(builtKeyMap)

    if (value) {
      setup(value)
      makeKeyMap()
      cm.addKeyMap(builtKeyMap)
    }
  }

  /**
   * Sets up the configuration for AutoCorrect.
   * @param {Mixed} option The new configuration of the AutoCorrect plugin.
   */
  function setup (option) {
    if (option.hasOwnProperty('replacements') && typeof option.replacements === 'object') {
      // In case we have a property "replacements" which is also an object
      // this indicates we should use this. If it's not an object,
      // it indicates that the user might want to replace "replacements"
      // with something.
      replacementCandidates = option.replacements
    } else if (option.hasOwnProperty('replacements') && option.keys === false) {
      // Deactivate replacements
      replacementCandidates = {}
    } else {
      // Assume key-value-pair object.
      replacementCandidates = option
    }

    // This variable indicates whether or not the user likes to
    // have word-style auto-correct or LibreOffice style
    // autocorrect. The former is a bit more aggressive in that
    // it also triggers when you type the last character of a
    // oreplacement-value. LibreOffice only replaces on Space
    // or Enter.
    wordStyleAutoCorrect = (!option.hasOwnProperty('style') || option.style !== 'LibreOffice')

    try {
      // If any of these properties is not present,
      // it will trigger an error, hence the
      // default mapping will be used.
      quotes = {
        'single': {
          'start': option.quotes.single.start,
          'end': option.quotes.single.end
        },
        'double': {
          'start': option.quotes.double.start,
          'end': option.quotes.double.end
        }
      }
    } catch (err) {
      // If no quotes are present, don't handle them.
      // This helps use the AutoCorrect functionality
      // without the Magic Quotes (e.g. to not block
      // the matchBrackets algorithm etc.)
      quotes = false
    }
  }

  /**
   * This function creates a keyMap to be passed to CodeMirror to handle.
   */
  function makeKeyMap () {
    builtKeyMap = {
      // Define the default handlers
      'Space': handleSpecial,
      'Enter': handleSpecial,
      'Backspace': handleBackspace,
      '\'"\'': function (cm) { return handleQuote(cm, 'double') },
      "'''": function (cm) { return handleQuote(cm, 'single') }
      // Afterwards, we can add characters as we deem fit (only Word-style AutoCorrect)
    }

    // In case of LibreOffice style AutoCorrect only
    // space and enter will trigger replacements.
    if (!wordStyleAutoCorrect) return

    // If we're here we should be using Word-style replacement, that is:
    // We need to retrieve the triggering characters
    var triggerCharacters = {}
    for (var key in replacementCandidates) {
      var character = key[key.length - 1]
      if (!triggerCharacters[character]) triggerCharacters[character] = {}
      triggerCharacters[character][key] = replacementCandidates[key]
    }

    // Finally, fill the keymap with the trigger characters
    for (var char in triggerCharacters) {
      // Create the handler and provide it with all potential
      // candidates for that very character. NOTE that we have
      // to surround these characters with LITERAL single quotes.
      // It does NOT suffice for them simply to be strings.
      builtKeyMap["'" + char + "'"] = makeHandler(triggerCharacters[char], char)
    }
  }

  /**
   * This function returns a handler function that will be called each
   * time the key is pressed, thereby ensuring it will replace the
   * corresponding value with its predefined replacement.
   * @param {Object} candidates A subset of the replacement table for the key
   * @param {string} key The key to be handled.
   */
  function makeHandler (candidates, key = '') {
    return function (cm) {
      return handleKey(cm, candidates, key)
    }
  }

  /**
   * This function checks whether or not there is a string to be replaced.
   * @param {CodeMirror} cm The CodeMirror instance
   * @param {Object} candidates A subset of the replacement table for the key
   * @param {string} key The key that is currently being handled.
   */
  function handleKey (cm, candidates, key) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    var cursor = cm.getCursor()
    // In case of overlay markdown modes, we need to make sure
    // we only apply this if we're in markdown.
    if (cm.getModeAt(cursor).name !== 'markdown') return CodeMirror.Pass
    // Additionally, we only should replace if we're not within comment-style tokens
    let tokens = cm.getTokenTypeAt(cursor)
    if (tokens && tokens.split(' ').includes('comment')) return CodeMirror.Pass

    var { cursorBegin, cursorEnd } = cursors(cursor, candidates)
    if (cursorBegin.ch === cursorEnd.ch) return CodeMirror.Pass // Empty range, no need to check
    var replacementOccurred = false
    for (; cursorBegin.ch < cursorEnd.ch; cursorBegin.ch++) {
      for (var candidate in candidates) {
        if (candidate === cm.getRange(cursorBegin, cursorEnd) + key) {
          cm.replaceRange(candidates[candidate], cursorBegin, cursorEnd)
          replacementOccurred = true
          if (wordStyleAutoCorrect) canPerformReverseReplacement = true // Activate reverse replacement
          break // No need to go through all of the candidates anymore
        }
      }
    }

    // Return CodeMirror.Pass if no replacement happened.
    if (!replacementOccurred) return CodeMirror.Pass
  }

  /**
   * Handles a special character.
   * @param {CodeMirror} cm The CodeMirror instance.
   */
  function handleSpecial (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    // In case of overlay markdown modes, we need to make sure
    // we only apply this if we're in markdown.
    var cursor = cm.getCursor()
    if (cm.getModeAt(cursor).name !== 'markdown') return CodeMirror.Pass
    // Additionally, we only should replace if we're not within comment-style tokens
    let tokens = cm.getTokenTypeAt(cursor)
    if (tokens && tokens.split(' ').includes('comment')) return CodeMirror.Pass

    canPerformReverseReplacement = false // Reset the handleBackspace flag
    hasJustAddedQuote = false // Reset the ability to reset the quote

    if (hasJustPerformedReverseReplacement) {
      // We should not re-replace something that
      // has just been reverse-engineered.
      hasJustPerformedReverseReplacement = false
      return CodeMirror.Pass
    }

    // The cursor will now be at the position BEFORE the space has been inserted
    var { cursorBegin, cursorEnd } = cursors(cursor, replacementCandidates)
    if (cursorBegin.ch === cursorEnd.ch) return CodeMirror.Pass // Empty range, no need to check
    for (; cursorBegin.ch < cursorEnd.ch; cursorBegin.ch++) {
      for (var candidate in replacementCandidates) {
        if (candidate === cm.getRange(cursorBegin, cursorEnd)) {
          // We have found a suitable candidate and can replace. However, we
          // need to check that both range endings are actually in the Markdown
          // mode (common case: the end delimiter of a YAML frontmatter)
          let beginInMd = cm.getModeAt(cursorBegin).name === 'markdown'
          let endInMd = cm.getModeAt(cursorEnd).name === 'markdown'
          if (!beginInMd || !endInMd) return CodeMirror.Pass

          // Replace! Use the +input origin so that the user can remove it with Cmd/Ctrl+Z
          cm.replaceRange(replacementCandidates[candidate], cursorBegin, cursorEnd)
          if (wordStyleAutoCorrect) canPerformReverseReplacement = true // Activate reverse replacement
          break // No need to go through all of the candidates anymore
        }
      }
    }

    // Return CodeMirror.Pass to have Space/Enter handled.
    return CodeMirror.Pass
  }

  /**
   * Handles the insertion of a quote, either single or double.
   * @param {CodeMirror} cm The CodeMirror instance.
   * @param {string} type The type of quote to be handled (single or double).
   */
  function handleQuote (cm, type) {
    if (quotes === false || cm.isReadOnly()) return CodeMirror.Pass
    var cursor = cm.getCursor()
    // In case of overlay markdown modes, we need to make sure
    // we only apply this if we're in markdown.
    if (cm.getModeAt(cursor).name !== 'markdown') return CodeMirror.Pass

    canPerformReverseReplacement = false // Reset the handleBackspace flag
    var cursorBefore = { 'line': cursor.line, 'ch': cursor.ch - 1 }

    // We have to check for two possibilities:
    // There's a "startChar" in front of the quote or not.
    if (cursor.ch === 0 || startChars.includes(cm.getRange(cursorBefore, cursor))) {
      cm.doc.replaceRange(quotes[type].start, cursor)
    } else {
      cm.doc.replaceRange(quotes[type].end, cursor)
    }

    hasJustAddedQuote = true
  }

  /**
   * Handles a backspace keypress if using Word style. It undoes the last replacement.
   * @param {CodeMirror} cm The CodeMirror instance.
   */
  function handleBackspace (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass

    if (hasJustAddedQuote) {
      hasJustAddedQuote = false // We can already reset this here

      // If there are selections, simply don't do it, because a selection means
      // the user wants to remove several things, and not want to undo any
      // Magic Quote.
      if (cm.doc.somethingSelected()) return CodeMirror.Pass

      // Re-set the last added quote
      let cursor = cm.getCursor()
      let rangeStart = cursor.ch - 1
      let line = cm.getLine(cursor.line)
      let allQuotes = [
        quotes.single.start,
        quotes.single.end,
        quotes.double.start,
        quotes.double.end
      ]

      // Now find out which quote it was
      let currentQuote = line.substr(rangeStart, 1)

      // We don't want the algorithm to replace quotes down the line,
      // so we'll only check the previous char
      if (!allQuotes.includes(currentQuote)) return CodeMirror.Pass

      let replacement = '"'
      if (allQuotes.slice(0, 2).includes(currentQuote)) replacement = "'"

      cm.doc.replaceRange(
        replacement,
        { 'line': cursor.line, 'ch': rangeStart },
        { 'line': cursor.line, 'ch': rangeStart + 1 }
      )
      return // We are done here
    }

    if (!wordStyleAutoCorrect || !canPerformReverseReplacement) return CodeMirror.Pass

    // What do we do here? Easy: Check if the characters preceeding the cursor equal a replacement table value. If they do,
    // replace that with the original replacement *key*.
    var reverse = {}
    for (var key in replacementCandidates) {
      reverse[replacementCandidates[key]] = key
    }

    // Now "handle" a key that never was pressed
    if (handleKey(cm, reverse, '') !== CodeMirror.Pass) {
      if (wordStyleAutoCorrect) hasJustPerformedReverseReplacement = true
    } else {
      return CodeMirror.Pass // Let the backspace be handled correctly.
    }
  }

  /**
   * Determines the maximum length of replacement candidates within a given field.
   * @param {Object} candidates The replacement table (or a subset thereof)
   */
  function getMaxCandidateLength (candidates) {
    var len = 0
    for (let key of Object.keys(candidates)) {
      if (key.length > len) len = key.length
    }
    return len
  }

  /**
   * Computes the beginning and the ending cursors
   * to perform an AutoCorrect operation on.
   * @param {Cursor} cursor The CodeMirror cursor from which to begin.
   * @param {Object} candidates An object of replacement candidates.
   */
  function cursors (cursor, candidates) {
    var cursorBegin = {
      'line': cursor.line,
      'ch': cursor.ch - getMaxCandidateLength(candidates)
    }
    if (cursorBegin.ch < 0) cursorBegin.ch = 0
    return {
      'cursorBegin': cursorBegin,
      'cursorEnd': cursor
    }
  }
})
