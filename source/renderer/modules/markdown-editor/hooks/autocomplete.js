/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror autocomplete hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Provides the functionality for the showHint plugin
 *
 * END HEADER
 */

var autocompleteStart = null
var currentDatabase = null
var availableDatabases = {
  'tags': [],
  'citekeys': [],
  'files': []
}

const CodeMirror = require('codemirror')

module.exports = {
  'autocompleteHook': (cm) => {
    // Listen to change events
    cm.on('change', (cm, changeObj) => {
      let autocompleteDatabase = shouldBeginAutocomplete(cm, changeObj)

      if (autocompleteDatabase === undefined) return

      autocompleteStart = Object.assign({}, cm.getCursor())
      currentDatabase = availableDatabases[autocompleteDatabase]
      cm.showHint({
        'hint': (cm, opt) => {
          console.log('Autocomplete plugin has called our helper!')
          return hint(cm, opt)
        }
      }) // END showHint
    })
  },
  'setAutocompleteDatabase': (type, database) => {
    const types = Object.keys(availableDatabases)
    if (!types.includes(type)) {
      console.error('Unsupported autocomplete database type! Supported are: ' + types.join(', '))
    } else {
      availableDatabases[type] = database
    }
  }
}

function shouldBeginAutocomplete (cm, changeObj) {
  // The easiest are citekeys
  if (changeObj.text[0] === '@') return 'citekeys'

  // Now we need some more stuff
  let cursor = cm.getCursor()
  let line = cm.getLine(cursor.line)

  // Can we begin tag autocompletion?
  if (changeObj.text[0] === '#' &&
    (cursor.ch === 1 || line.charAt(cursor.ch - 2) === ' ')) return 'tags'

  // Can we begin file autocompletion?
  let linkStart = cm.getOption('zettlr').zettelkasten.linkStart
  let linkStartRange = cm.getRange({
    'line': cursor.line,
    'ch': cursor.ch - linkStart.length
  }, {
    'line': cursor.line,
    'ch': cursor.ch
  })

  if (linkStartRange === linkStart) return 'files'

  return undefined // Nothing to do for us here
}

function hint (cm, opt) {
  let term = cm.getRange(autocompleteStart, cm.getCursor()).toLowerCase()
  let completionObject = {
    'list': Object.keys(currentDatabase).filter((key) => {
      // First search the ID. Second, search the displayText, if available.
      // Third: return false if nothing else has matched.
      if (currentDatabase[key].text.toLowerCase().indexOf(term) === 0) return true
      if (currentDatabase[key].hasOwnProperty('displayText') && currentDatabase[key].displayText.toLowerCase().indexOf(term) >= 0) return true
      return false
    })
      .sort((a, b) => {
        // This sorter makes sure "special" things are always sorted top
        let aClass = currentDatabase[a].className !== undefined
        let bClass = currentDatabase[b].className !== undefined
        let aMatch = currentDatabase[a].matches || 0
        let bMatch = currentDatabase[b].matches || 0
        if (aClass && !bClass) return -1
        if (!aClass && bClass) return 1
        if (aClass && bClass) return aMatch - bMatch
        return 0
      })
      .map(key => currentDatabase[key]),
    'from': autocompleteStart,
    'to': cm.getCursor()
  }

  // Set the autocomplete to false as soon as the user has actively selected something.
  CodeMirror.on(completionObject, 'pick', (completion) => {
    // In case the user wants to link a file, intercept during
    // the process and add the file link according to the user's
    // preference settings.
    if (currentDatabase === availableDatabases['files']) {
      // Get the correct setting
      let linkPref = global.config.get('zkn.linkWithFilename')
      // Prepare the text to insert, removing the ID if found in the filename
      let text = completion.displayText
      if (completion.id && text.indexOf(completion.id) >= 0) {
        text = text.replace(completion.id, '').trim()
      }
      // In case the whole filename consists of the ID, well.
      // Then, have your ID duplicated.
      if (text.length === 0) text = completion.displayText
      let cur = Object.assign({}, cm.getCursor())
      // Check if the linkEnd has been already inserted
      let line = cm.getLine(cur.line)
      let end = cm.getOption('zettlr').zettelkasten.linkEnd
      let prefix = ' '
      let linkEndMissing = false
      if (end !== '' && line.substr(cur.ch, end.length) !== end) {
        // Add the linkend
        prefix = end + prefix
        linkEndMissing = true
      } else {
        // Advance the cursor so that it is outside of the link again
        cur.ch += end.length
        cm.setCursor(cur)
      }
      if (linkPref === 'always' || (linkPref === 'withID' && completion.id)) {
        // We need to add the text after the link.
        cm.replaceSelection(prefix + text)
      } else if (linkEndMissing) {
        cm.replaceSelection(end) // Add the link ending
      }
    }
    autocompleteStart = null
    currentDatabase = null // Reset the database used for the hints.
  })

  return completionObject
}
