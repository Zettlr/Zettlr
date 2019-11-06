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
 * HOW TO USE THIS PLUGIN
 *
 * 1. Include this file in the HTML document you would like to use CodeMirror on.
 * 2. This plugin defines a new option, "autoCorrect", which you can use.
 *
 * The autoCorrect option can have three forms, Boolean, a simple object, or the
 * full configuration.
 *
 * autoCorrect = false (Boolean)
 *
 *     This means that the plugin is deactivated.
 *
 * autoCorrect = key-value-pairs object
 *
 *     If the option only contains an object with key-value pairs, it will
 *     assume this to be the replacement table. It will assume default quotes
 *     (that is, ASCII double- and single quotes: " and ') and also fall back
 *     to the WORD style AutoCorrect.
 *
 * The full configuration looks like this:
 *
 * autoCorrect: {
 *   // Style: Any other value than "LibreOffice" means: Word style.
 *   style: 'LibreOffice',
 *   quotes: {
 *     // Should be self-explanatory. If ANY value is not correct,
 *     // the plugin falls back to default.
 *     double: { start: '"', end: '"' }
 *     single: { start: ''', end: ''' }
 *   },
 *   keys: {
 *     // This is the replacement table, some possible values:
 *     '-->': '→', // The "key" will be replaced with "value"
 *     '<--': '←',
 *     '<->': '↔',
 *   }
 * }
 */

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('../../../node_modules/codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../../../node_modules/codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  // This variable will hold the computed keyMap (we need to store it externally so that
  // it can be removed in case the user deactivates the AutoCorrect plugin at runtime)
  var builtKeyMap

  // This variable holds the replacement characters for quotes
  var quotes

  // This variable holds the final table for key-value pairs to be replaced.
  var replacementCandidates = {}

  // Do we use Word-style AutoCorrect, or LibreOffice?
  var wordStyleAutoCorrect = true

  // This variable will be set to true after a normal key replacement has taken place.
  // As long as the variable is true, handleBackspace will reverse a replacement by
  // looking up the replacements backwards. As soon as a special character (Space or Enter)
  // is used, the variable will be set to false again.
  var canPerformReverseReplacement = false

  // This is the next variable we need. In case we have just performed a reverse-replacement
  // we need to prevent the special characters from re-doing that replacement once again, so
  // for one instance we need to stop these handlers from calling.
  var hasJustPerformedReverseReplacement = false

  CodeMirror.defineOption('autoCorrect', false /* Inactive by default */, function (cm, value, oldValue) {
    // Define the autocorrect option

    // Remove the keymap before re-assigning it, if it has been present
    // before
    if (oldValue && oldValue !== CodeMirror.Init) cm.removeKeyMap(builtKeyMap)

    // Do we have a new value? (if value = false this means the option is deactivated)
    if (value) {
      console.log('Activating AutoCorrect ...')
      builtKeyMap = makeKeyMap(value) // Create the correct keyMap from the object passed
      cm.addKeyMap(builtKeyMap)

      // Now we need to extract the quotes (if present)
      try {
        // If any of these properties is not present, it will trigger an error,
        // hence the default mapping will be used.
        quotes = {
          'single': {
            'start': value.quotes.single.start,
            'end': value.quotes.single.end
          },
          'double': {
            'start': value.quotes.double.start,
            'end': value.quotes.double.end
          }
        }
      } catch (err) {
        quotes = {
          'single': { 'start': "'", 'end': "'" },
          'double': { 'start': '"', 'end': '"' }
        }
      }
    } else {
      console.log('AutoCorrect is deactivated.')
    }
  })

  /**
   * This function creates a keyMap to be passed to CodeMirror to handle.
   * @param {Object} keys An object containing all the keys and their replacements
   */
  function makeKeyMap (value) {
    replacementCandidates = value // Assume key-value-pair object.
    if (value['keys'] && typeof value['keys'] === 'object') {
      // In case we have a property "keys" which is also an object
      // this indicates we should use this. If it's not an object,
      // it indicates that the user might want to replace "keys"
      // with something.
      replacementCandidates = value['keys']
    }

    var keyMap = {
      // Define the default handlers
      'Space': handleSpecial,
      'Enter': handleSpecial,
      'Backspace': handleBackspace,
      '\'"\'': function (cm) { return handleQuote(cm, 'double') },
      "'''": function (cm) { return handleQuote(cm, 'single') }
      // Afterwards, we can add characters as we deem fit (only Word-style AutoCorrect)
    }

    // This variable indicates whether or not the user likes to
    // have word-style auto-correct or LibreOffice style
    // autocorrect. The former is a bit more aggressive in that
    // it also triggers when you type the last character of a
    // oreplacement-value. LibreOffice only replaces on Space
    // or Enter.
    wordStyleAutoCorrect = (value['style'] !== 'LibreOffice') // false means: LibreOffice style, fallback is Word style.

    // Do we have LibreOffice-style AutoCorrect? In this case, immediately
    // return the default keymap, as our work here is done (only the default
    // keymap's keys will trigger AutoCorrect).
    if (!wordStyleAutoCorrect) return keyMap

    // If we're here we should be using Word-style replacement, that is: the
    // last character of a replacement should be triggering a replacement, so
    // let's do it!
    var triggerCharacters = {}
    for (var key in replacementCandidates) {
      var character = key[key.length - 1] // Retrieve the last character
      if (!triggerCharacters[character]) triggerCharacters[character] = {}
      triggerCharacters[character][key] = replacementCandidates[key]
    }

    // Now we have an object in the form of
    // {
    //   '>': {
    //     '-->': '→',
    //     '==>', '→'
    //   },
    //   '=': {
    //     '!=': '≠'
    //   }
    // }

    // What we need to do finally is to extend the default keymap with the
    // trigger characters.
    for (var char in triggerCharacters) {
      // Create the handler and provide it with all potential
      // candidates for that very character. NOTE that we have
      // to surround these characters with LITERAL single quotes.
      // It does NOT suffice for them simply to be strings.
      keyMap["'" + char + "'"] = makeHandler(triggerCharacters[char], char)
    }

    // Finally return that thing!
    return keyMap
  }

  /**
   * This function returns a handler function that will be called each
   * time the key is pressed, thereby ensuring it will replace the
   * corresponding value with its predefined replacement.
   * @param {Object} candidates All the candidate key-value-pairs for which the key is responsible.
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
   * @param {Object} candidates All the candidate key-value-pairs for which the key is responsible.
   * @param {string} key The key to be handled. Necessary, because it won't be in the document at this point.
   */
  function handleKey (cm, candidates, key) {
    if (cm.getOption('disableInput')) return CodeMirror.Pass
    var cursor = cm.getCursor()
    // In case of overlay markdown modes, we need to make sure
    // we only apply this if we're in markdown.
    if (cm.getModeAt(cursor).name !== 'markdown') return CodeMirror.Pass

    var cursorEnd = cursor // Starting position
    var cursorBegin = { 'line': cursorEnd.line, 'ch': cursorEnd.ch }
    var replacementOccurred = false
    while (cursorBegin.ch >= 0) {
      cursorBegin.ch--
      for (var candidate in candidates) {
        if (candidate === cm.getRange(cursorBegin, cursorEnd) + key) {
          // Replace! Use the +input origin so that the user can remove it with Cmd/Ctrl+Z
          cm.replaceRange(candidates[candidate], cursorBegin, cursorEnd, '+input')
          replacementOccurred = true
          if (wordStyleAutoCorrect) canPerformReverseReplacement = true // Activate reverse replacement
          break // No need to go through all of the candidates anymore
        }
      }
    }

    // Return CodeMirror.Pass either if nothing has been replaced OR if the alwaysPass flag has been set.
    if (!replacementOccurred) return CodeMirror.Pass
  }

  /**
   * Handles a special character (special insofar as the trigger needs to be passed along).
   * @param {CodeMirror} cm The CodeMirror instance.
   */
  function handleSpecial (cm) {
    if (cm.getOption('disableInput')) return CodeMirror.Pass
    // In case of overlay markdown modes, we need to make sure
    // we only apply this if we're in markdown.
    var cursor = cm.getCursor()
    if (cm.getModeAt(cursor).name !== 'markdown') return CodeMirror.Pass

    canPerformReverseReplacement = false // Reset the handleBackspace flag

    if (hasJustPerformedReverseReplacement) {
      // We should not re-replace something that
      // has just been reverse-engineered.
      hasJustPerformedReverseReplacement = false
      return CodeMirror.Pass
    }

    // The cursor will now still be at the position BEFORE the space has been inserted
    var cursorEnd = cursor // Starting position
    var cursorBegin = { 'line': cursorEnd.line, 'ch': cursorEnd.ch }
    while (cursorBegin.ch >= 0) {
      cursorBegin.ch--
      for (var candidate in replacementCandidates) {
        if (candidate === cm.getRange(cursorBegin, cursorEnd)) {
          // Replace! Use the +input origin so that the user can remove it with Cmd/Ctrl+Z
          cm.replaceRange(replacementCandidates[candidate], cursorBegin, cursorEnd, '+input')
          if (wordStyleAutoCorrect) canPerformReverseReplacement = true // Activate reverse replacement
          break // No need to go through all of the candidates anymore
        }
      }
    }

    // Return CodeMirror.Pass to have Space/Enter handled.
    return CodeMirror.Pass
  }

  /**
   * Handles the insertion of a quote, thereby distinguishing between opening and closing quotes.
   * @param {CodeMirror} cm The CodeMirror instance.
   * @param {string} type The type of quote to be handled (single or double).
   */
  function handleQuote (cm, type) {
    if (cm.getOption('disableInput')) return CodeMirror.Pass
    var cursor = cm.getCursor()
    // In case of overlay markdown modes, we need to make sure
    // we only apply this if we're in markdown.
    if (cm.getModeAt(cursor).name !== 'markdown') return CodeMirror.Pass

    canPerformReverseReplacement = false // Reset the handleBackspace flag

    // We have to check for two possibilities: There's a space
    // in front of the double quote or not.
    var cursorBefore = { 'line': cursor.line, 'ch': cursor.ch - 1 }
    var preceededBySpace = cm.getRange(cursorBefore, cursor) === ' '

    // Make sure nothing is selected, before replacing the "selection"
    cm.setSelection(cursor)
    if (preceededBySpace) {
      cm.replaceSelection(quotes[type].start)
    } else {
      cm.replaceSelection(quotes[type].end)
    }
  }

  /**
   * Handles a backspace keypress, but only if we're in Word-style replacement. It undoes the last replacement.
   * @param {CodeMirror} cm The CodeMirror instance.
   */
  function handleBackspace (cm) {
    // handleBackspace will only be valid in Word-style mode, if input is allowed AND if reverseReplacement can be performed.
    if (!wordStyleAutoCorrect || cm.getOption('disableInput') || !canPerformReverseReplacement) return CodeMirror.Pass

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
})
