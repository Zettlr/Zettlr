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

import { getCodeBlockRE } from '@common/regular-expressions'
import CodeMirror, { on } from 'codemirror'
import { DateTime } from 'luxon'
import { v4 as uuid } from 'uuid'
import generateId from '@common/util/generate-id'
import headingToID from '../util/heading-to-id'

// We need two code block REs: First the line-wise, and then the full one.
const codeBlockRE = getCodeBlockRE(false)
const codeBlockMultiline = getCodeBlockRE(true)
const path = window.path

interface AutocompleteDatabaseEntry {
  text: string
  displayText?: string
  className?: string
  matches?: number
}

interface TextSnippetTextMarker {
  index: number
  markers: CodeMirror.TextMarker[]
}

/**
 * Whenever there is an autocompletion going on, this variable will contain its
 * starting position
 *
 * @var {CodeMirror.Position|null}
 */
let autocompleteStart: CodeMirror.Position|null = null

/**
 * This variable holds the key of the current database used for autocompletion
 * as long as there is an autocompletion going on.
 *
 * @var {keyof typeof availableDatabases|null}
 */
let currentDatabase: keyof typeof availableDatabases|null = null

/**
 * This property contains the last change object. This is necessary to restart
 * the autocomplete if the user deleted everything written (since that will end
 * the autocompletion)
 *
 * @var {string|null}
 */
let lastChangeText: string|null

/**
 * This object holds all available databases for autocompletion
 */
const availableDatabases = {
  tags: [] as AutocompleteDatabaseEntry[],
  citekeys: [] as AutocompleteDatabaseEntry[],
  files: [] as AutocompleteDatabaseEntry[],
  snippets: [] as AutocompleteDatabaseEntry[],
  headings: [] as AutocompleteDatabaseEntry[],
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
    { text: 'fortran', displayText: 'Fortran' },
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
  ] as AutocompleteDatabaseEntry[]
}

/**
 * This keymap is being used to cycle through the tabstops of a recently added
 * snippet. You can stop the process early by pressing Escape.
 *
 * @var {CodeMirror.KeyMap}
 */
const snippetsKeymap: CodeMirror.KeyMap = {
  'Tab': nextTabstop,
  'Esc': (cm: CodeMirror.Editor) => {
    // Clear all remaining textmarkers
    for (const elem of currentTabStops) {
      for (const textMark of elem.markers) {
        textMark.clear()
      }
    }
    currentTabStops = []
    cm.removeKeyMap(snippetsKeymap)
  }
}

/**
 * An array containing all textmarkers used by the templating system.
 *
 * @var {TextSnippetTextMarker[]}
 */
let currentTabStops: TextSnippetTextMarker[] = []

/**
 * This function runs over the full document to extract ATX heading IDs and
 * saves them to the local variable `currentHeadingIDs`.
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
function collectHeadingIDs (cm: CodeMirror.Editor): void {
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

    const text = headingToID(match[1])

    availableDatabases.headings.push({
      text: text,
      displayText: '#' + text
    })
  }
}

/**
 * Hooks autocomplete onto the CodeMirror editor
 *
 * @param   {CodeMirror.Editor}  cm  The CM instance
 */
export function autocompleteHook (cm: CodeMirror.Editor): void {
  // Listen to change events
  cm.on('change', (cm, changeObj) => {
    // On every change event, make sure to update the heading IDs
    collectHeadingIDs(cm)

    if (autocompleteStart !== null && currentDatabase !== null) {
      // We are currently autocompleting something, let's finish that first.
      return
    }

    lastChangeText = changeObj.text[0]

    const autocompleteDatabase = shouldBeginAutocomplete(cm)

    if (autocompleteDatabase === undefined) {
      return
    }

    beginAutocomplete(cm, autocompleteDatabase)
  })

  cm.on('endCompletion', () => {
    autocompleteStart = null
    currentDatabase = null

    // Immediately check if we can begin a new autocomplete. This will be the
    // case if the user has just deleted everything they typed without leaving
    // the correct space to re-initiate an autocomplete
    const autocompleteDatabase = shouldBeginAutocomplete(cm)
    if (autocompleteDatabase !== undefined) {
      beginAutocomplete(cm, autocompleteDatabase)
    }
  })
}

export function setAutocompleteDatabase (type: string, database: any): void {
  if (!(type in availableDatabases)) {
    throw new Error(`Unknown database type ${type}`)
  }

  // Make additional adjustments if necessary
  if (type === 'tags') {
    // Here, we get an object from main which is not in the right data format
    // (it's a hashmap, not an array)
    let tagHints = Object.keys(database as { [key: string]: any }).map(key => {
      return {
        text: database[key].text,
        displayText: '#' + String(database[key].text),
        className: database[key].className // Optional, can be undefined
      }
    })

    availableDatabases[type] = tagHints
  } else if ([ 'citekeys', 'snippets' ].includes(type)) {
    // These databases work as they are
    availableDatabases[type as keyof typeof availableDatabases] = database
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

function beginAutocomplete (cm: CodeMirror.Editor, autocompleteDatabase: keyof typeof availableDatabases): void {
  // Determine if we accept spaces within the autocomplete
  const spaceCfg = Boolean(window.config.get('editor.autocompleteAcceptSpace'))

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
}

/**
 * Determins the correct database for an autocomplete operation, if applicable.
 *
 * @param   {CodeMirror}  cm           The editor instance
 * @param   {any}         changeObj    The changeObject to be used to determine the database.
 *
 * @return  {string|undefined}         Either the database name, or undefined
 */
function shouldBeginAutocomplete (cm: CodeMirror.Editor): keyof typeof availableDatabases|undefined {
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
    lastChangeText === '@' && (isSOL || [ ' ', '[', '-' ].includes(charBefore))
  ) {
    return 'citekeys'
  }

  // Can we begin tag autocompletion?
  if (lastChangeText === '#' && (isSOL || charBefore === ' ')) {
    return 'tags'
  }

  // Can we begin autocompleting a snippet?
  if (lastChangeText === ':' && (isSOL || charBefore === ' ')) {
    return 'snippets'
  }

  // This will return true if the user began typing a hashtag within a link,
  // e.g. [some text](#), indicating they want to refer a heading within the doc.
  if (lastChangeText === '#' && charTwoBefore + charBefore === '](') {
    return 'headings'
  }

  // Can we begin file autocompletion?
  const linkStart: string = (cm as any).getOption('zettlr').zettelkasten.linkStart
  const linkStartRange = cm.getRange({
    line: cursor.line,
    ch: cursor.ch - linkStart.length
  }, {
    line: cursor.line,
    ch: cursor.ch
  })

  if (linkStartRange === linkStart) {
    return 'files'
  }

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
function getHints (term: string): any[] {
  if (currentDatabase === null) {
    return []
  }

  let results = availableDatabases[currentDatabase].filter((entry) => {
    // First search the display text, then the entry text itself
    if (entry.displayText?.toLowerCase().includes(term) === true) {
      return true
    }

    if (entry.text.toLowerCase().includes(term)) {
      return true
    }

    // No match
    return false
  })

  results = results.sort((entryA, entryB) => {
    // This sorter makes sure "special" things are always sorted top
    const aClass = entryA.className !== undefined
    const bClass = entryB.className !== undefined
    const aMatch = (entryA.matches !== undefined) ? entryA.matches : 0
    const bMatch = (entryB.matches !== undefined) ? entryB.matches : 0
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
function hintFunction (cm: CodeMirror.Editor, opt: CodeMirror.ShowHintOptions): CodeMirror.Hints|undefined {
  if (autocompleteStart === null) {
    throw new Error('Could not instantiate completion object: autocompleteStart was null')
  }

  const term = cm.getRange(autocompleteStart, cm.getCursor()).toLowerCase()
  const completionObject: CodeMirror.Hints = {
    list: getHints(term),
    from: autocompleteStart,
    to: cm.getCursor()
  }

  // Set the autocomplete to false as soon as the user has actively selected something.
  on(completionObject, 'pick', (completion: any) => {
    lastChangeText = null // Always reset this!
    if (autocompleteStart === null) {
      throw new Error('Could not autocomplete: autocompleteStart was null')
    }

    // In case the user wants to link a file, intercept during
    // the process and add the file link according to the user's
    // preference settings.
    if (currentDatabase === 'files') {
      // Prepare the text to insert, removing the ID if found in the filename
      let text: string = completion.displayText
      const fileId: string = completion.id

      if (fileId !== '' && text.includes(fileId)) {
        text = text.replace(fileId, '').trim()

        // The file database has this id: filename thing which we need to
        // account for. TODO: Do it like a grown up and retrieve the filename
        // from somewhere else -- CodeMirror allows for arbitrary objects to be
        // present here, so possibly this is the more elegant solution.
        if (text.substring(0, 2) === ': ') {
          text = text.substring(2)
        }

        // If the text now ends up empty because the displayText equals the ID,
        // make sure we reset it back to using the displayText
        if (text.length === 0 || text === ':') {
          text = completion.displayText
        }
      }

      const cur = cm.getCursor()
      // Check if the linkEnd has been already inserted
      const line = cm.getLine(cur.line)
      const end: string = (cm as any).getOption('zettlr').zettelkasten.linkEnd
      let prefix = ' '

      if (end !== '' && line.substring(cur.ch, cur.ch + end.length) !== end) {
        // Add the linkend
        prefix = end + prefix
      } else {
        // Advance the cursor so that it is outside of the link again
        cm.setCursor({ line: cur.line, ch: cur.ch + end.length })
      }

      const linkPref = window.config.get('zkn.linkWithFilename')
      const fnameOnly: boolean = window.config.get('zkn.linkFilenameOnly')

      if (!fnameOnly && (linkPref === 'always' || (linkPref === 'withID' && completion.id !== ''))) {
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
      const citeStyle: 'in-text'|'in-text-suffix'|'regular' = (cm as any).getOption('zettlr').citeStyle
      const line = cm.getLine(autocompleteStart.line)
      const fromCh = autocompleteStart.ch
      const toCh = autocompleteStart.ch + (completion.text as string).length
      const afterOpen = line.lastIndexOf('[', fromCh) > line.lastIndexOf(']', fromCh)
      // Either no open and 1 close bracket or a close bracket after an open bracket
      const beforeClose = (!line.includes('[', toCh) && line.includes(']', toCh)) || (line.indexOf(']', toCh) < line.indexOf('[', toCh))
      const noBrackets = !afterOpen && !beforeClose
      if (citeStyle === 'regular' && noBrackets) {
        // Add square brackets around
        const lineNo = autocompleteStart.line
        const fromCh = autocompleteStart.ch - 1
        const toCh = autocompleteStart.ch + (completion.text as string).length
        cm.setSelection(
          { line: lineNo, ch: fromCh },
          { line: lineNo, ch: toCh },
          { scroll: false }
        )
        cm.replaceSelection(`[@${completion.text as string}]`)
        // Now back up one character to set the cursor inside the brackets
        cm.setCursor({ line: lineNo, ch: toCh + 1 })
      } else if (citeStyle === 'in-text-suffix' && noBrackets) {
        // We should add square brackets after the completion text
        cm.replaceSelection(' []')
        cm.setCursor({
          line: autocompleteStart.line,
          ch: autocompleteStart.ch + (completion.text as string).length + 2
        })
      } // Otherwise: citeStyle was in-text, i.e. we can leave everything as is
    } else if (currentDatabase === 'snippets') {
      // For this database, we must remove the leading colon and also fiddle
      // with the text. So first, let's select everything.
      const insertedLines: string[] = completion.text.split('\n')
      const from = {
        line: autocompleteStart.line,
        ch: autocompleteStart.ch - 1
      }
      const to = {
        line: autocompleteStart.line + insertedLines.length - 1,
        ch: insertedLines[insertedLines.length - 1].length
      }
      // If insertedLines is 1, we have to account for the autocompleteStart.ch
      if (insertedLines.length === 1) {
        to.ch += autocompleteStart.ch
      }

      // Then, insert the text, but with all variables replaced and only the
      // tabstops remaining.
      const actualTextToInsert = replaceSnippetVariables(completion.text, cm)
      const actualInsertedLines = actualTextToInsert.split('\n').length
      cm.replaceRange(actualTextToInsert, from, to)

      // Now adapt the to to account for added newlines during replacement
      to.line += actualInsertedLines - insertedLines.length

      // If we are still dealing with just a single line, adapt `to.ch`
      if (from.line === to.line) {
        to.ch += actualTextToInsert.split('\n')[actualInsertedLines - 1].length - insertedLines[0].length
        // Also substract the colon from ch, since that has been replaced above
        to.ch--
      } else {
        to.ch = actualTextToInsert.split('\n')[actualInsertedLines - 1].length
      }

      // Now, we need to mark every tabstop within this section of text and
      // store those text markers so that we can find them again by tabbing
      // through them.
      currentTabStops = getTabMarkers(cm, from, to)

      // Now activate our special snippets keymap which will ensure the user can
      // cycle through all placeholders which we have identified.
      cm.addKeyMap(snippetsKeymap)

      // Plus, move to the first tabstop already so the user can start immediately.
      nextTabstop(cm)
    }
  })

  // If the hint is being closed, always reset the variables.
  // NOTE: There's also the endCompletion event, which does the same,
  // only that that event is being fired if the user types an, e.g., space
  // closingCharacters on the hintOption.
  on(completionObject, 'close', () => {
    autocompleteStart = null
    currentDatabase = null
    lastChangeText = null
  })

  return completionObject
}

/**
 * Creates markers within the CodeMirror instance corresponding to the tabstops
 * and returns the list.
 *
 * @param   {CodeMirror.Editor}    cm    The Editor instance
 * @param   {CodeMirror.Position}  from  The line from which to begin analysing the text
 * @param   {CodeMirror.Position}  to    The final line (exclusive) until which to analyse.
 *
 * @return  {TextSnippetTextMarker[]}    An array of created text markers
 */
function getTabMarkers (cm: CodeMirror.Editor, from: CodeMirror.Position, to: CodeMirror.Position): TextSnippetTextMarker[] {
  let tabStops: TextSnippetTextMarker[] = []

  // We have to remember the end of the snippet in case there is text following.
  // Since CodeMirror updates the position of bookmarks, we can cheat a little.
  // If there is no $0 in the snippet, we use this one, otherwise we clear it
  // after having placed all tabstops.
  const endMarkerElement = document.createElement('span')
  endMarkerElement.classList.add('tabstop')
  endMarkerElement.textContent = '0'
  const endMarker = cm.setBookmark(to, { widget: endMarkerElement })

  for (let i = from.line; i <= to.line; i++) {
    let line = cm.getLine(i)
    let match = null

    // NOTE: The negative lookbehind
    const varRE = /(?<!\\)\$(\d+)|(?<!\\)\$\{(\d+):(.+?)\}/g

    // Account for when some snippet has been inserted in between some text
    if (i === from.line && from.ch > 0) {
      // Make sure that the RegExp starts searching only from the beginning of
      // the actual snippet to preserve $-signs before it
      varRE.lastIndex = from.ch
    } else if (i === to.line && to.ch < line.length) {
      // Likewise, make sure that the regexp doesn't match $-signs AFTER the snippet
      line = line.substring(0, to.ch)
    }

    while ((match = varRE.exec(line)) !== null) {
      const ch = match.index
      const index = parseInt(match[1] ?? match[2], 10)
      const replaceWith = match[3]

      const localFrom = { line: i, ch: ch }
      const localTo = { line: i, ch: ch + match[0].length }
      cm.replaceRange((replaceWith !== undefined) ? replaceWith : '', localFrom, localTo)

      // After the replacement, we need to "re-get" the line because it has
      // changed now and otherwise the regexp will get confused.
      varRE.lastIndex = ch
      line = cm.getLine(i)

      // While we don't need to adapt the lastIndex anymore, we still need to
      // make sure to cut off irrelevant text from the line so the regexp
      // doesn't match things it should not match
      if (i === to.line && to.ch < line.length) {
        line = line.substring(0, to.ch)
      }

      if (replaceWith !== undefined) {
        // In this case, we must replace the marker with the default text
        // and create a TextMarker.
        const marker = cm.markText(
          localFrom,
          { line: localFrom.line, ch: localFrom.ch + replaceWith.length },
          { className: 'tabstop' }
        )
        tabStops.push({ index: index, markers: [marker] })
      } else {
        // Here we don't need a TextMarker, but rather a Bookmark,
        // since it's basically a single-char range.
        const elem = document.createElement('span')
        elem.classList.add('tabstop')
        elem.textContent = index.toString()
        const marker = cm.setBookmark(localFrom, { widget: elem })
        tabStops.push({ index: index, markers: [marker] })
      }
    }
  }

  // Next on, group markers with the same index together. This will later enable
  // mirroring of input by the user (since multiple markers can be active at the
  // same time).
  tabStops = tabStops.reduce((acc: TextSnippetTextMarker[], val) => {
    // acc contains the resultant array, val the current marker
    const existingValue = acc.find(elem => elem.index === val.index)
    if (existingValue !== undefined) {
      // The marker already exists
      existingValue.markers = existingValue.markers.concat(val.markers)
    } else {
      // The marker doesn't yet exist -> create
      acc.push({ index: val.index, markers: val.markers })
    }
    return acc // We just have to return the reference to the array again
  }, []) // initialValue: An empty array

  // Now we just need to sort the currentTabStops
  tabStops.sort((a, b) => { return a.index - b.index })

  // Lastly, put the 0 to the top (if there is a zero)
  if (tabStops.length > 0 && tabStops[0].index === 0) {
    tabStops.push(tabStops.shift() as TextSnippetTextMarker)
    // Don't forget to clear the (wrong) endmarker
    endMarker.clear()
  } else {
    // If there is no zero, we must make sure to add one "pseudo-$0" after the
    // selection so that the cursor ends up there afterwards. This is why we
    // have saved the endMarker above.
    tabStops.push({ index: 0, markers: [endMarker] })
  }

  return tabStops
}

/**
 * A utility function that replaces snippet variables with their correct values
 * dynamically.
 *
 * @param   {string}             text  The text to modify
 * @param   {CodeMirror.Editor}  cm    The editor instance
 *
 * @return  {string}                   The text with all variables replaced accordingly.
 */
function replaceSnippetVariables (text: string, cm: CodeMirror.Editor): string {
  // First, prepare our replacement table
  const now = DateTime.now()
  const month = now.month
  const day = now.day
  const hour = now.hour
  const minute = now.minute
  const second = now.second
  const clipboard = window.clipboard.readText()

  const absPath = (cm as any).getOption('zettlr').metadata.path as string

  const REPLACEMENTS = {
    CURRENT_YEAR: now.year,
    CURRENT_YEAR_SHORT: now.year.toString().substring(2),
    CURRENT_MONTH: (month < 10) ? '0' + month.toString() : month,
    CURRENT_MONTH_NAME: now.monthLong,
    CURRENT_MONTH_NAME_SHORT: now.monthShort,
    CURRENT_DATE: (day < 10) ? '0' + day.toString() : day,
    CURRENT_HOUR: (hour < 10) ? '0' + hour.toString() : hour,
    CURRENT_MINUTE: (minute < 10) ? '0' + minute.toString() : minute,
    CURRENT_SECOND: (second < 10) ? '0' + second.toString() : second,
    CURRENT_SECONDS_UNIX: now.toSeconds(),
    UUID: uuid(),
    CLIPBOARD: (clipboard !== '') ? clipboard : undefined,
    ZKN_ID: generateId(window.config.get('zkn.idGen')),
    CURRENT_ID: (cm as any).getOption('zettlr').metadata.id as string,
    FILENAME: path.basename(absPath),
    DIRECTORY: path.dirname(absPath),
    EXTENSION: path.extname(absPath)
  }

  // Second: Replace those variables, and return the text. NOTE we're adding a
  // negative lookbehind -- (?<!\\) -- to make sure we're not including escaped ones.
  return text.replace(/(?<!\\)\$([A-Z_]+)|(?<!\\)\$\{([A-Z_]+):(.+?)\}/g, (match, p1, p2, p3) => {
    if (p1 !== undefined) {
      // We have a single variable, so only replace if it's a supported one
      if (REPLACEMENTS[p1 as keyof typeof REPLACEMENTS] !== undefined) {
        return REPLACEMENTS[p1 as keyof typeof REPLACEMENTS]
      } else {
        return match
      }
    } else {
      // We have a variable with placeholder, so replace it potentially with the default
      if (REPLACEMENTS[p2 as keyof typeof REPLACEMENTS] !== undefined) {
        return REPLACEMENTS[p2 as keyof typeof REPLACEMENTS]
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
function nextTabstop (cm: CodeMirror.Editor): void {
  const elem = currentTabStops.shift()
  if (elem === undefined) {
    // We're done
    cm.removeKeyMap(snippetsKeymap)
    return
  }

  const allSelections: Array<{ anchor: CodeMirror.Position, head: CodeMirror.Position }> = []
  for (const marker of elem.markers) {
    // Set the current selection, differentiating between tabstops and placeholders.
    const position = marker.find()
    if (position === undefined) {
      continue
    }

    if ('from' in position && 'to' in position) {
      allSelections.push({ anchor: position.from, head: position.to })
    } else {
      allSelections.push({ anchor: position, head: position })
    }
    marker.clear()
  }

  // Finally apply all selections at once
  cm.setSelections(allSelections)
}
