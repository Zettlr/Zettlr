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

const { getCodeBlockRE } = require('../../../../common/regular-expressions')
const codeBlockRE = getCodeBlockRE()

var autocompleteStart = null
var currentDatabase = null
var availableDatabases = {
  'tags': [],
  'citekeys': [],
  'files': [],
  'syntaxHighlighting': [
    { text: '', displayText: 'No highlighting' }, // TODO: translate
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
    { text: 'mermaid', displayText: 'Mermaid' },
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

      // If we're here, we can begin an autocompletion
      autocompleteStart = Object.assign({}, cm.getCursor())
      currentDatabase = availableDatabases[autocompleteDatabase]
      cm.showHint({
        hint: hintFunction,
        completeSingle: false
      }) // END showHint
    })

    // endCompletion

    // The "endCompletion" event (currently undocumented) is only fired on
    // the CodeMirror instance, and _not_ the completion object. Hence, we
    // define it here.
    cm.on('endCompletion', () => {
      autocompleteStart = null
      currentDatabase = null
    })
  },
  'setAutocompleteDatabase': (type, database) => {
    // Make additional adjustments if necessary
    if (type === 'tags') {
      // Here, we get an object from main which is not in the right data format
      // (it's a hashmap, not an array)
      let tagHints = Object.keys(database).map(key => {
        return {
          text: database[key].text,
          displayText: '#' + database[key].text,
          className: database[key].className // Optional, can be undefined
        }
      })

      availableDatabases[type] = tagHints
    } else if (type === 'citekeys') {
      // This database works as-is
      availableDatabases[type] = database
    } else if (type === 'files') {
      let fileHints = Object.keys(database).map(key => {
        return {
          text: database[key].text,
          displayText: database[key].displayText,
          className: database[key].className,
          id: database[key].id // We need to add the ID property (if applicable)
        }
      })

      availableDatabases[type] = fileHints
    } else {
      const types = Object.keys(availableDatabases)
      console.error('Unsupported autocomplete database type! Supported are: ' + types.join(', '))
    }
  }
}

/**
 * Determins the correct database for an autocomplete operation, if applicable.
 *
 * @param   {CodeMirror}  cm           The editor instance
 * @param   {any}         changeObj    The changeObject to be used to determine the database.
 *
 * @return  {string|undefined}         Either the database name, or undefined
 */
function shouldBeginAutocomplete (cm, changeObj) {
  // First, get cursor and line.
  const cursor = cm.getCursor()
  const line = cm.getLine(cursor.line)

  // Determine if we are at the start of line (ch equals 1, because the cursor
  // is now _after_ the first character of the line -- isSOL refers to the char
  // that was just typed).
  const isSOL = cursor.ch === 1
  // charAt returns an empty string if the index is out of range (e.g. -1)
  const charBefore = line.charAt(cursor.ch - 2)

  // Can we begin citekey autocompletion?
  // A valid citekey position is: Beginning of the line (citekey without square
  // brackets), after a square bracket open (regular citation without prefix),
  // or after a space (either a standalone citation or within square brackets
  // but with a prefix). Also, the citekey can be prefixed with a -.
  if (
    changeObj.text[0] === '@' && (isSOL || [ ' ', '[', '-' ].includes(charBefore))
  ) {
    return 'citekeys'
  }

  // Can we begin tag autocompletion?
  if (
    changeObj.text[0] === '#' && (isSOL || charBefore === ' ')
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
  if (codeBlockRE.test(line)) {
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

/**
 * Called everytime the selection changes by the showHint addon to provide an
 * updated list of hint items.
 *
 * @param   {string}  term  The term used to find matches
 *
 * @return  {any[]}         An array of completion items
 */
function getHints (term) {
  let results = currentDatabase.filter((entry) => {
    // First search the display text, then the entry text itself
    if (
      entry.displayText !== undefined &&
      entry.displayText.toLowerCase().indexOf(term) >= 0
    ) {
      return true
    }

    if (entry.text.toLowerCase().indexOf(term) >= 0) {
      return true
    }

    // No match
    return false
  })

  results = results.sort((entryA, entryB) => {
    // This sorter makes sure "special" things are always sorted top
    let aClass = entryA.className !== undefined
    let bClass = entryB.className !== undefined
    let aMatch = (entryA.matches !== undefined) ? entryA.matches : 0
    let bMatch = (entryB.matches !== undefined) ? entryB.matches : 0
    if (aClass && !bClass) return -1
    if (!aClass && bClass) return 1
    if (aClass && bClass) return aMatch - bMatch
    return 0
  })

  return results
}

/**
 * Hinting function used for the autocomplete functionality
 *
 * @param   {CodeMirror}  cm   The editor instance
 * @param   {any}  opt         The options passed to the showHint option
 *
 * @return  {any}              The completion object
 */
function hintFunction (cm, opt) {
  let term = cm.getRange(autocompleteStart, cm.getCursor()).toLowerCase()
  let completionObject = {
    'list': getHints(term),
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
      if (completion.id) {
        // The displayText in this regard contains <ID>: <filename>, so remove
        // the first part because we don't need it.
        text = text.substring(completion.id.length + 2).trim()
      }

      if (completion.id && text.indexOf(completion.id) >= 0) {
        text = text.replace(completion.id, '').trim()

        // The file database has this id: filename thing which we need to
        // account for. TODO: Do it like a grown up and retrieve the filename
        // from somewhere else -- CodeMirror allows for arbitrary objects to be
        // present here, so possibly this is the more elegant solution.
        if (text.substr(0, 2) === ': ') {
          text = text.substr(2)
        }
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

      if (linkEndMissing) {
        cm.replaceSelection(end) // Add the link ending
      }

      if (linkPref === 'always' || (linkPref === 'withID' && completion.id !== '')) {
        // We need to add the text after the link.
        cm.replaceSelection(prefix + text)
      }
    } else if (currentDatabase === availableDatabases['syntaxHighlighting']) {
      // In the case of an accepted syntax highlighting, we can assume the user
      // has manually begun writing a code block, so we are probably right
      // to assume that the user would think it's nice if we also add the
      // closing part of the code block and set the cursor in the middle of the
      // newly rendered codeblock.
      const line = cm.getLine(autocompleteStart.line)
      const match = codeBlockRE.exec(line)
      if (match !== null) {
        cm.replaceSelection('\n\n' + match[1])
        cm.setCursor({ line: autocompleteStart.line + 1, ch: 0 })
      }
    } else if (currentDatabase === availableDatabases['citekeys']) {
      // Here, what we will add are square brackets, if these are not yet
      // present around the citekey. We know that the cursor is now behind the
      // inserted key. It's easiest to perform a forward search (as most
      // citations will be written at the end of lines).
      let notClosed = true
      let notOpened = true
      const line = cm.getLine(autocompleteStart.line)

      const firstCh = autocompleteStart.ch + completion.text.length
      for (let i = firstCh; i < line.length; i++) {
        if (line[i] === ']') {
          // If we find an opening bracket before a closing one, we are done.
          notClosed = false
          break
        } else if (line[i] === '[') {
          break // It appears to be closed
        }
      }
      // We have one half of a square-bracket citation. We need to make sure.
      for (let i = autocompleteStart.ch; i >= 0; i--) {
        if (line[i] === '[') {
          // If we find a closing bracket, we definitely need to surround.
          notOpened = false
          break
        } else if (line[i] === ']') {
          break // It appears to be opened
        }
      }

      if (notOpened && notClosed) {
        // We need to add square brackets
        const lineNo = autocompleteStart.line
        const fromCh = autocompleteStart.ch - 1
        const toCh = autocompleteStart.ch + completion.text.length
        cm.setSelection(
          { line: lineNo, ch: fromCh },
          { line: lineNo, ch: toCh },
          { scroll: false }
        )
        cm.replaceSelection(`[@${completion.text}]`)
        // Now back up one character to set the cursor inside the brackets
        cm.setCursor({ line: lineNo, ch: toCh + 1 })
      }
    }
    autocompleteStart = null
    currentDatabase = null // Reset the database used for the hints.
  })

  // If the hint is being closed, always reset the variables.
  // NOTE: There's also the endCompletion event, which does the same,
  // only that that event is being fired if the user types an, e.g., space
  // closingCharacters on the hintOption.
  CodeMirror.on(completionObject, 'close', () => {
    autocompleteStart = null
    currentDatabase = null
  })

  return completionObject
}
