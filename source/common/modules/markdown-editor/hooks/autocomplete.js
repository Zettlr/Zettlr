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

const { getCodeBlockRE } = require('../../../regular-expressions')
// We need two code block REs: First the line-wise, and then the full one.
const codeBlockRE = getCodeBlockRE(false)
const codeBlockMultiline = getCodeBlockRE(true)
const CodeMirror = require('codemirror')
const { DateTime } = require('luxon')
const uuid = require('uuid').v4
const generateId = require('../../../util/generate-id').default

let autocompleteStart = null
let currentDatabase = null
const availableDatabases = {
  tags: [],
  citekeys: [],
  files: [],
  snippets: [],
  headings: [],
  syntaxHighlighting: [
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
    { text: 'perl', displayText: 'Perl' },
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

/**
 * This keymap is being used to cycle through the tabstops of a recently added
 * snippet. You can stop the process early by pressing Escape.
 *
 * @var {CodeMirror.KeyMap}
 */
const snippetsKeymap = {
  'Tab': nextTabstop,
  'Esc': (cm) => {
    for (const marker of currentTabStops) {
      marker.clear()
    }
    currentTabStops = []
    cm.removeKeyMap(snippetsKeymap)
  }
}

/**
 * An array containing all textmarkers used by the templating system.
 *
 * @var {any[]}
 */
let currentTabStops = []

/**
 * This function runs over the full document to extract ATX heading IDs and
 * saves them to the local variable `currentHeadingIDs`.
 *
 * @param   {CodeMirror}  cm  The CodeMirror instance
 */
function collectHeadingIDs (cm) {
  availableDatabases.headings = []

  const atxRE = /^#{1,6}\s(.+)$/

  let val = cm.getValue()
  // Remove all code blocks
  val = val.replace(codeBlockMultiline, '')
  codeBlockMultiline.lastIndex = 0 // IMPORTANT: Remember to reset this (global flag)

  for (const line of val.split('\n')) {
    const match = atxRE.exec(line)

    if (match === null) {
      continue
    }

    // We got an ATX heading. Now we need to transform it into a Pandoc ID.
    // The algorithm is described here: https://pandoc.org/MANUAL.html#extension-auto_identifiers
    let text = match[1]

    // Remove all formatting, links, etc.
    text = text.replace(/[*_]{1,3}(.+)[*_]{1,3}/g, '$1')
    text = text.replace(/`[^`]+`/g, '$1')
    text = text.replace(/\[.+\]\(.+\)/g, '')
    // Remove all footnotes.
    text = text.replace(/\[\^.+\]/g, '')
    // Replace all spaces and newlines with hyphens.
    text = text.replace(/[\s\n]/g, '-')
    // Remove all non-alphanumeric characters, except underscores, hyphens, and periods.
    text = text.replace(/[^a-zA-Z0-9_.-]/g, '')
    // Convert all alphabetic characters to lowercase.
    text = text.toLowerCase()
    // Remove everything up to the first letter (identifiers may not begin with a number or punctuation mark).
    const letterMatch = /[a-z]/.exec(text)
    const firstLetter = (letterMatch !== null) ? letterMatch.index : 0
    text = text.substr(firstLetter)
    // If nothing is left after this, use the identifier section.
    if (text.length === 0) {
      text = 'section'
    }

    availableDatabases.headings.push({
      text: text,
      displayText: '#' + text
    })
  }
}

module.exports = {
  'autocompleteHook': (cm) => {
    // Listen to change events
    cm.on('change', (cm, changeObj) => {
      // On every change event, make sure to update the heading IDs
      collectHeadingIDs(cm)

      if (autocompleteStart !== null && currentDatabase !== null) {
        // We are currently autocompleting something, let's finish that first.
        return
      }

      let autocompleteDatabase = shouldBeginAutocomplete(cm, changeObj)

      if (autocompleteDatabase === undefined) {
        return
      }

      // Determine if we accept spaces within the autocomplete
      const spaceCfg = Boolean(global.config.get('editor.autocompleteAcceptSpace'))

      // We do not allow spaces for these databases:
      const DISALLOW_SPACES = [
        'tags',
        'headings'
      ]

      const space = spaceCfg && !DISALLOW_SPACES.includes(autocompleteDatabase)

      // If we're here, we can begin an autocompletion
      autocompleteStart = Object.assign({}, cm.getCursor())
      currentDatabase = autocompleteDatabase
      cm.showHint({
        hint: hintFunction,
        completeSingle: false,
        closeCharacters: (space) ? /[()[\]{};:>,]/ : undefined
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
    } else if ([ 'citekeys', 'snippets' ].includes(type)) {
      // These databases work as they are
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
  const charTwoBefore = line.charAt(cursor.ch - 3)

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
  if (changeObj.text[0] === '#' && (isSOL || charBefore === ' ')) {
    return 'tags'
  }

  // Can we begin autocompleting a snippet?
  if (changeObj.text[0] === ':' && (isSOL || charBefore === ' ')) {
    return 'snippets'
  }

  // This will return true if the user began typing a hashtag within a link,
  // e.g. [some text](#), indicating they want to refer a heading within the doc.
  if (changeObj.text[0] === '#' && charTwoBefore + charBefore === '](') {
    return 'headings'
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
    if (modeLineBefore.name === 'markdown-zkn') {
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
  let results = availableDatabases[currentDatabase].filter((entry) => {
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

  // Only return the top 50 matches (any more won't be visible in the dropdown either way.)
  // This is in response to #2678, since 14,000 entries might take a while to render.
  return results.slice(0, 50)
}

/**
 * Hinting function used for the autocomplete functionality
 *
 * @param   {CodeMirror.Editor}  cm   The editor instance
 * @param   {any}  opt         The options passed to the showHint option
 *
 * @return  {any}              The completion object
 */
function hintFunction (cm, opt) {
  let term = cm.getRange(autocompleteStart, cm.getCursor()).toLowerCase()
  let completionObject = {
    list: getHints(term),
    from: autocompleteStart,
    to: cm.getCursor()
  }

  // Set the autocomplete to false as soon as the user has actively selected something.
  CodeMirror.on(completionObject, 'pick', (completion) => {
    // In case the user wants to link a file, intercept during
    // the process and add the file link according to the user's
    // preference settings.
    if (currentDatabase === 'files') {
      // Get the correct setting
      let linkPref = global.config.get('zkn.linkWithFilename')
      // Prepare the text to insert, removing the ID if found in the filename
      let text = completion.displayText
      if (completion.id !== '') {
        // The displayText in this regard contains <ID>: <filename>, so remove
        // the first part because we don't need it.
        text = text.substring(completion.id.length + 2).trim()
      }

      if (completion.id !== '' && text.indexOf(completion.id) >= 0) {
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
    } else if (currentDatabase === 'syntaxHighlighting') {
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
    } else if (currentDatabase === 'citekeys') {
      const { citeStyle } = cm.getOption('zettlr')
      const line = cm.getLine(autocompleteStart.line)
      const fromCh = autocompleteStart.ch
      const toCh = autocompleteStart.ch + completion.text.length
      const afterOpen = line.lastIndexOf('[', fromCh) > line.lastIndexOf(']', fromCh)
      // Either no open and 1 close bracket or a close bracket after an open bracket
      const beforeClose = (line.indexOf('[', toCh) < 0 && line.indexOf(']', toCh) >= 0) || (line.indexOf(']', toCh) < line.indexOf('[', toCh))
      const noBrackets = !afterOpen && !beforeClose
      if (citeStyle === 'regular' && noBrackets) {
        // Add square brackets around
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
      } else if (citeStyle === 'in-text-suffix' && noBrackets) {
        // We should add square brackets after the completion text
        cm.replaceSelection(' []')
        cm.setCursor({
          line: autocompleteStart.line,
          ch: autocompleteStart.ch + completion.text.length + 2
        })
      } // Otherwise: citeStyle was in-text, i.e. we can leave everything as is
    } else if (currentDatabase === 'snippets') {
      // For this database, we must remove the leading colon and also fiddle
      // with the text. So first, let's select everything.
      const insertedLines = completion.text.split('\n')
      cm.setSelection(
        { line: autocompleteStart.line, ch: autocompleteStart.ch - 1 },
        { line: autocompleteStart.line + insertedLines.length - 1, ch: insertedLines[insertedLines.length - 1].length },
        { scroll: false }
      )

      // Then, insert the text, but with all variables replaced and only the
      // tabstops remaining.
      const actualTextToInsert = replaceSnippetVariables(completion.text)
      const actualInsertedLines = actualTextToInsert.split('\n').length
      cm.replaceSelection(actualTextToInsert)

      // Now, we need to mark every tabstop within this section of text and
      // store those text markers so that we can find them again by tabbing
      // through them.
      currentTabStops = getTabMarkers(cm, autocompleteStart.line, autocompleteStart.line + actualInsertedLines)

      // Now activate our special snippets keymap which will ensure the user can
      // cycle through all placeholders which we have identified.
      cm.addKeyMap(snippetsKeymap)

      // Plus, move to the first tabstop already so the user can start immediately.
      nextTabstop(cm)
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

/**
 * Creates markers within the CodeMirror instance corresponding to the tabstops
 * and returns the list.
 *
 * @param   {CodeMirror.Editor}  cm    The Editor instance
 * @param   {number}             from  The line from which to begin analysing the text
 * @param   {number}             to    The final line (exclusive) until which to analyse.
 *
 * @return  {TextMarkers[]}            An array of created text markers
 */
function getTabMarkers (cm, from, to) {
  let tabStops = []
  for (let i = from; i < to; i++) {
    let line = cm.getLine(i)
    let match = null

    // NOTE: The negative lookbehind
    const varRE = /(?<!\\)\$(\d+)|(?<!\\)\$\{(\d+):(.+?)\}/g

    while ((match = varRE.exec(line)) !== null) {
      const ch = match.index
      const index = parseInt(match[1] || match[2], 10)
      const replaceWith = match[3]

      const from = { line: i, ch: ch }
      const to = { line: i, ch: ch + match[0].length }
      cm.setSelection(from, to)
      cm.replaceSelection((replaceWith !== undefined) ? replaceWith : '')
      // After the replacement, we need to "re-get" the line because it has
      // changed now and otherwise the regexp will get confused.
      varRE.lastIndex = ch
      line = cm.getLine(i)

      if (replaceWith !== undefined) {
        // In this case, we must replace the marker with the default text
        // and create a TextMarker.
        const marker = cm.markText(
          from,
          { line: from.line, ch: from.ch + replaceWith.length },
          { className: 'tabstop' }
        )
        tabStops.push({ index: index, marker: marker })
      } else {
        // Here we don't need a TextMarker, but rather a Bookmark,
        // since it's basically a single-char range.
        const elem = document.createElement('span')
        elem.classList.add('tabstop')
        elem.textContent = index
        const marker = cm.setBookmark(from, { widget: elem })
        tabStops.push({ index: index, marker: marker })
      }
    }
  }

  // Next on, group markers with the same index together. This will later enable
  // mirroring of input by the user (since multiple markers can be active at the
  // same time).
  tabStops = tabStops.reduce((acc, val) => {
    // acc contains the resultant array, val the current marker
    const existingValue = acc.find(elem => elem.index === val.index)
    if (existingValue !== undefined) {
      // The marker already exists
      existingValue.markers.push(val.marker)
    } else {
      // The marker doesn't yet exist -> create
      acc.push({
        index: val.index,
        markers: [val.marker]
      })
    }
    return acc // We just have to return the reference to the array again
  }, []) // initialValue: An empty array

  // Now we just need to sort the currentTabStops and map it so only the
  // marker remains.
  tabStops.sort((a, b) => { return a.index - b.index })
  // Now put the 0 to the top (if there is a zero)
  if (tabStops[0].index === 0) {
    tabStops.push(tabStops.shift())
  } else {
    // If there is no zero, we must make sure to add one "pseudo-$0" after the
    // selection so that the cursor ends up there afterwards.
    const elem = document.createElement('span')
    elem.classList.add('tabstop')
    elem.textContent = '0'
    const marker = cm.setBookmark(
      { line: to - 1, ch: cm.getLine(to - 1).length },
      { widget: elem }
    )
    tabStops.push({ index: 0, markers: [marker] })
  }

  // Make the array marker only
  return tabStops // .map(elem => elem.marker)
}

/**
 * A utility function that replaces snippet variables with their correct values
 * dynamically.
 *
 * @param   {string}  text  The text to modify
 *
 * @return  {string}        The text with all variables replaced accordingly.
 */
function replaceSnippetVariables (text) {
  // First, prepare our replacement table
  const now = DateTime.now()
  const month = now.month
  const day = now.day
  const hour = now.hour
  const minute = now.minute
  const second = now.second
  const clipboard = window.clipboard.readText()

  const REPLACEMENTS = {
    CURRENT_YEAR: now.year,
    CURRENT_YEAR_SHORT: now.year.toString().substr(2),
    CURRENT_MONTH: (month < 10) ? '0' + month : month,
    CURRENT_MONTH_NAME: now.monthLong,
    CURRENT_MONTH_NAME_SHORT: now.monthShort,
    CURRENT_DATE: (day < 10) ? '0' + day : day,
    CURRENT_HOUR: (hour < 10) ? '0' + hour : hour,
    CURRENT_MINUTE: (minute < 10) ? '0' + minute : minute,
    CURRENT_SECOND: (second < 10) ? '0' + second : second,
    CURRENT_SECONDS_UNIX: now.toSeconds(),
    UUID: uuid(),
    CLIPBOARD: (clipboard !== '') ? clipboard : undefined,
    ZKN_ID: generateId(global.config.get('zkn.idGen'))
  }

  // Second: Replace those variables, and return the text. NOTE we're adding a
  // negative lookbehind -- (?<!\\) -- to make sure we're not including escaped ones.
  return text.replace(/(?<!\\)\$([A-Z_]+)|(?<!\\)\$\{([A-Z_]+):(.+?)\}/g, (match, p1, p2, p3) => {
    if (p1 !== undefined) {
      // We have a single variable, so only replace if it's a supported one
      if (REPLACEMENTS[p1] !== undefined) {
        return REPLACEMENTS[p1]
      } else {
        return match
      }
    } else {
      // We have a variable with placeholder, so replace it potentially with the default
      if (REPLACEMENTS[p2] !== undefined) {
        return REPLACEMENTS[p2]
      } else {
        return p3
      }
    }
  })
}

/**
 * A utility function bound to Tabs. Whenever called, this function jumps to the
 * next tabstop/placeholder.
 *
 * @param   {CodeMirror.Editor}  cm  The editor instance
 */
function nextTabstop (cm) {
  const elem = currentTabStops.shift()
  if (elem === undefined) {
    // We're done
    cm.removeKeyMap(snippetsKeymap)
    return
  }

  const allSelections = []
  for (const marker of elem.markers) {
    // Set the current selection, differentiating between tabstops and placeholders.
    const position = marker.find()
    if ('from' in position && 'to' in position) {
      allSelections.push({ anchor: position.from, head: position.to })
    } else {
      allSelections.push({ anchor: position })
    }
    marker.clear()
  }

  // Finally apply all selections at once
  cm.setSelections(allSelections)
}
