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
  'files': [],
  'syntaxHighlighting': [
    { text: 'javascript', displayText: 'JavaScript/Node.JS' },
    { text: 'json', displayText: 'JSON' },
    { text: 'typescript', displayText: 'TypeScript' },
    { text: 'c', displayText: 'C' },
    { text: 'cpp', displayText: 'C++' },
    { text: 'csharp', displayText: 'C#' },
    { text: 'clojure', displayText: 'Clojure' },
    { text: 'elm', displayText: 'Elm' },
    { text: 'fsharp', displayText: 'F#' },
    { text: 'java', displayText: 'Java' },
    { text: 'kotlin', displayText: 'Kotlin' },
    { text: 'haskell', displayText: 'Haskell' },
    { text: 'objectivec', displayText: 'Objective-C' },
    { text: 'scala', displayText: 'Scala' },
    { text: 'css', displayText: 'CSS' },
    { text: 'scss', displayText: 'SCSS' },
    { text: 'less', displayText: 'LESS' },
    { text: 'html', displayText: 'HTML' },
    { text: 'markdown', displayText: 'Markdown' },
    { text: 'xml', displayText: 'XML' },
    { text: 'tex', displayText: 'TeX' },
    { text: 'php', displayText: 'PHP' },
    { text: 'python', displayText: 'Python' },
    { text: 'r', displayText: 'R' },
    { text: 'ruby', displayText: 'Ruby' },
    { text: 'sql', displayText: 'SQL' },
    { text: 'swift', displayText: 'Swift' },
    { text: 'bash', displayText: 'Bash' },
    { text: 'visualbasic', displayText: 'Visual Basic' },
    { text: 'yaml', displayText: 'YAML' },
    { text: 'go', displayText: 'Go' },
    { text: 'rust', displayText: 'Rust' },
    { text: 'julia', displayText: 'Julia' },
    { text: 'turtle', displayText: 'Turtle' },
    { text: 'sparql', displayText: 'SparQL' },
    { text: 'verilog', displayText: 'Verilog' },
    { text: 'systemverilog', displayText: 'SystemVerilog' },
    { text: 'vhdl', displayText: 'VHDL' },
    { text: 'tcl', displayText: 'TCL' },
    { text: 'scheme', displayText: 'Scheme' },
    { text: 'clisp', displayText: 'Common Lisp' },
    { text: 'powershell', displayText: 'Powershell' },
    { text: 'smalltalk', displayText: 'Smalltalk' },
    { text: 'dart', displayText: 'Dart' },
    { text: 'toml', displayText: 'TOML/INI' },
    { text: 'docker', displayText: 'Dockerfile' },
    { text: 'diff', displayText: 'Diff' }
  ]
}

const CodeMirror = require('codemirror')

module.exports = {
  'autocompleteHook': (cm) => {
    // Listen to change events
    cm.on('change', (cm, changeObj) => {
      if (autocompleteStart !== null && currentDatabase !== null) {
        // We are currently autocompleting something, let's finish that first.
        return
      }

      let autocompleteDatabase = shouldBeginAutocomplete(cm, changeObj)

      if (autocompleteDatabase === undefined) {
        return
      }

      autocompleteStart = Object.assign({}, cm.getCursor())
      currentDatabase = availableDatabases[autocompleteDatabase]
      cm.showHint({
        'hint': (cm, opt) => {
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
  const cursor = cm.getCursor()
  const line = cm.getLine(cursor.line)

  // Can we begin citekey autocompletion?
  // A valid citekey position is: Beginning of the line (citekey without square
  // brackets), after a square bracket open (regular citation without prefix),
  // or after a space (either a standalone citation or within square brackets
  // but with a prefix).
  if (
    changeObj.text[0] === '@' &&
    (cursor.ch === 1 || [ ' ', '[' ].includes(line.charAt(cursor.ch - 2)))
  ) {
    return 'citekeys'
  }

  // Can we begin tag autocompletion?
  if (
    changeObj.text[0] === '#' &&
    (cursor.ch === 1 || line.charAt(cursor.ch - 2) === ' ')
  ) {
    return 'tags'
  }

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

  // Now check for syntax highlighting
  if (
    (line.startsWith('```') || line.startsWith('~~~')) &&
    cursor.ch === 3 // We should only begin autocomplete immediately after the delimiters
  ) {
    // First line means it's definitely the beginning of the block
    if (cursor.line === 0) {
      return 'syntaxHighlighting'
    }
    // Check if the mode on the line *before* is still Markdown
    let modeLineBefore = cm.getModeAt({ line: cursor.line - 1, ch: 0 })
    if (modeLineBefore.name === 'markdown') {
      // If our own line starts with a codeblock, but the line before is
      // still in Markdown mode, this means we have the beginning of a codeblock.
      return 'syntaxHighlighting'
    }
  }

  return undefined // Nothing to do for us here
}

function hint (cm, opt) {
  let term = cm.getRange(autocompleteStart, cm.getCursor()).toLowerCase()
  let completionObject = {
    'list': Object.keys(currentDatabase).filter((key) => {
      // First search the ID. Second, search the displayText, if available.
      // Third: return false if nothing else has matched.
      if (currentDatabase[key].text.toLowerCase().indexOf(term) >= 0) return true
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
    } else if (currentDatabase === availableDatabases['syntaxHighlighting']) {
      // In the case of an accepted syntax highlighting, we can assume the user
      // has manually begun writing a code block, so we are probably right
      // to assume that the user would think it's nice if we also add the
      // closing part of the code block and set the cursor in the middle of the
      // newly rendered codeblock.
      const line = cm.getLine(autocompleteStart.line)
      if (line.startsWith('```')) {
        // completion.text += '\n\n```'
        cm.replaceSelection('\n\n```')
        cm.setCursor({ line: autocompleteStart.line + 1, ch: 0 })
      } else if (line.startsWith('~~~')) {
        cm.replaceSelection('\n\n```')
        cm.setCursor({ line: autocompleteStart.line + 1, ch: 0 })
      }
    }
    autocompleteStart = null
    currentDatabase = null // Reset the database used for the hints.
  })

  return completionObject
}
