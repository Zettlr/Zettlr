/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Snippets Autocomplete
 * CVM-Role:        Autocomplete Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin manages snippets.
 *
 * END HEADER
 */

// It is very nice that Codemirror offers snippets out of the box, but
// unfortunately the syntax is incompatible with Textmate, so for backwards
// compatibility we'll have to reimplement it here. This is largely the code
// responsible for snippets in the old implementation, but now disentangled from
// the other autocompletes thanks to the new plugin structure of Codemirror 6.

import { type Completion } from '@codemirror/autocomplete'
import {
  StateEffect,
  StateField,
  EditorSelection,
  Facet,
  type SelectionRange,
  type EditorState
} from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import { type AutocompletePlugin } from '.'
import { DateTime } from 'luxon'
import { v4 as uuid } from 'uuid'
import generateId from '@common/util/generate-id'
import { configField } from '../util/configuration'
import { gemoji } from 'gemoji'
import { pathBasename, pathDirname, pathExtname } from '@common/util/renderer-path-polyfill'

/**
 * This utility function inserts an emoji
 */
const applyEmoji = function (view: EditorView, completion: Completion, from: number, to: number): void {
  view.dispatch({
    changes: [{ from: from - 1, to, insert: completion.label }],
    selection: { anchor: from - 1 + completion.label.length }
  })
}

const emojis: Completion[] = gemoji.map(g => {
  return {
    label: g.emoji,
    detail: g.names.join(', '),
    section: g.category,
    info: g.tags.join(', '),
    apply: applyEmoji
  }
})

// Define a class to highlight active tabstops
const tabstopDeco = Decoration.mark({ class: 'tabstop' })

// This widget is used to mark simple tabstops with no default text (so that
// they're visible and users can see where the cursor will end up next).
class SnippetWidget extends WidgetType {
  constructor (readonly content: string, readonly range: SelectionRange) {
    super()
  }

  eq (other: SnippetWidget): boolean {
    return other.content === this.content && other.range.eq(this.range)
  }

  toDOM (_view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.classList.add('tabstop')
    elem.innerText = this.content
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return true // By default ignore all events
  }
}

/**
 * This utility function inserts a snippet
 */
function applySnippet (view: EditorView, completion: Completion, from: number, to: number): void {
  template2snippet(view.state, completion.info as string, from - 1)
    .then(([ textToInsert, selections ]) => {
      // We can immediately take the first rangeset and set it as a selection, whilst
      // committing the rest into our StateField as an effect
      const firstSelection = selections.shift()
      view.dispatch({
        changes: [{ from: from - 1, to, insert: textToInsert }],
        selection: firstSelection,
        effects: snippetTabsEffect.of(selections)
      })
    })
    .catch(err => console.error(err))
}

/**
 * Used internally to add ranges for the snippets to the state
 */
const snippetTabsEffect = StateEffect.define<EditorSelection[]>()

/**
 * This effect is used to indicate to the library that it should remove the
 * first active range (so that the widget decorator can immediately remove the
 * widget for the next selection range).
 */
const shiftNextTabEffect = StateEffect.define()

/**
 * Use this effect to provide the editor state with a set of new snippets to autocomplete
 */
export const snippetsUpdate = StateEffect.define<Array<{ name: string, content: string }>>()

interface SnippetStateField {
  availableSnippets: Completion[]
  activeSelections: EditorSelection[]
}

export const snippetsUpdateField = StateField.define<SnippetStateField>({
  create (_state) {
    return {
      availableSnippets: [],
      activeSelections: []
    }
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(snippetsUpdate)) {
        val.availableSnippets = effect.value.map(entry => {
          return {
            label: entry.name,
            info: entry.content,
            apply: applySnippet
          }
        })

        return { ...val }
      } else if (effect.is(snippetTabsEffect)) {
        val.activeSelections = effect.value
        return { ...val }
      } else if (effect.is(shiftNextTabEffect)) {
        // NOTE: We cannot shift the range in the nextTab() command, as this
        // change is not transparent to the library (hence it would render a
        // widget also for the currently selected range, as it would only pick
        // up the fact that this range doesn't exist anymore after the user
        // starts typing, which re-evaluates the length of the activeRanges
        // array.)
        val.activeSelections.shift()
        return { ...val }
      }
    }

    if (!transaction.docChanged || val.activeSelections.length === 0) {
      return val
    }

    // This monstrosity ensures that our ranges stay in sync while the user types
    val.activeSelections = val.activeSelections.map(selection => {
      return selection.map(transaction.changes)
    })

    return { ...val }
  },
  // Turns any active ranges into decorations to highlight them
  provide: field => {
    return EditorView.decorations.from(field, (fieldValue) => {
      if (fieldValue.activeSelections.length === 0) {
        return Decoration.none
      }

      const decorations: any[] = []
      let position = 0
      for (const selection of fieldValue.activeSelections) {
        position++
        for (const range of selection.ranges) {
          if (range.empty) {
            const widget = new SnippetWidget(`$${position}`, range)
            decorations.push(Decoration.widget({ widget }).range(range.from))
          } else {
            decorations.push(tabstopDeco.range(range.from, range.to))
          }
        }
      }

      // NOTE: Our activeRanges are not guaranteed to be sorted from beginning
      // to end of the document (since the user may also jump back and forth) in
      // their snippet. Since the library expects them to be sorted, we pass in
      // `true` as a second parameter so that the library sorts these ranges for
      // us.
      return Decoration.set(decorations, true)
    })
  }
})

/**
 * Takes a template string and returns a two-element array containing (a) the
 * template text with all variables and tabstops replaced so that it can be
 * inserted into a document, and (b) a two-dimensional list of ranges in the
 * correct order for tabbing through them.
 *
 * @param   {string}  template              The template string
 * @param   {number}  rangeOffset           The global offset at which the
 *                                          template will be inserted
 *
 * @return  {[string, EditorSelection[]]}  The final text as well as tabstop
 *                                          ranges (if any)
 */
async function template2snippet (state: EditorState, template: string, rangeOffset: number): Promise<[string, EditorSelection[]]> {
  const rawRanges: Array<{ position: number, ranges: SelectionRange[] }> = []
  let finalText = await replaceSnippetVariables(state, template)

  // Matches $[0-9] as well as ${[0-9]:default string}
  const tabStopRE = /(?<!\\)\$(\d+)|(?<!\\)\$\{(\d+):(.+?)\}/ // NOTE: No g flag

  let match: null|RegExpExecArray = null
  while ((match = tabStopRE.exec(finalText)) !== null) {
    const position = parseInt(match[1] ?? match[2], 10)
    const replacementString: string|undefined = match[3]
    const from = rangeOffset + match.index
    const to = (replacementString !== undefined) ? from + replacementString.length : from

    finalText = finalText.replace(match[0], replacementString ?? '')
    rawRanges.push({ position, ranges: [EditorSelection.range(from, to)] })
  }

  if (rawRanges.length === 0) {
    return [ finalText, [] ] // Already done!
  }

  // Combine multiple ranges with the same position together
  const combinedRanges = rawRanges.reduce<Array<{ position: number, ranges: SelectionRange[] }>>((acc, value) => {
    const { position, ranges } = value
    const existingRange = acc.find(v => v.position === position)
    if (existingRange !== undefined) {
      existingRange.ranges = existingRange.ranges.concat(ranges)
    } else {
      acc.push(value)
    }

    return acc
  }, [])

  // Sort the ranges ascending, except the zero, which needs at the bottom
  combinedRanges.sort((a, b) => {
    if (a.position === 0) {
      return 1 // Bring to back
    } else if (b.position === 0) {
      return -1
    } else {
      return a.position - b.position
    }
  })

  // Check that there's a zero in there. If not, add one to the back.
  if (combinedRanges[combinedRanges.length - 1].position !== 0) {
    combinedRanges.push({ position: 0, ranges: [EditorSelection.cursor(rangeOffset + finalText.length)] })
  }

  // For the rest of the script, it's irrelevant which position the tabs had,
  // since it expects the array to be sorted anyways, so we can omit that info now.
  const slections = combinedRanges.map(v => EditorSelection.create(v.ranges))

  return [ finalText, slections ]
}

/**
   * A utility function that replaces snippet variables with their correct values
   * dynamically.
   *
   * @param   {string}             text  The text to modify
   *
   * @return  {string}                   The text with all variables replaced accordingly.
   */
async function replaceSnippetVariables (state: EditorState, text: string): Promise<string> {
  // First, prepare our replacement table
  const now = DateTime.now()
  const month = now.month
  const day = now.day
  const hour = now.hour
  const minute = now.minute
  const second = now.second
  const clipboard = await navigator.clipboard.readText()

  const config = state.field(configField)
  const absPath = config.metadata.path

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
    ZKN_ID: generateId(String(window.config.get('zkn.idGen'))),
    CURRENT_ID: config.metadata.id,
    FILENAME: pathBasename(absPath, pathExtname(absPath)),
    DIRECTORY: pathDirname(absPath),
    EXTENSION: pathExtname(absPath)
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
 * This facet allows the user to dynamically define which character triggers the
 * autocompletion.
 */
export const autocompleteTriggerCharacter: Facet<string, string> = Facet.define({
  combine (val) { return val.length > 0 ? val[0] : ':' }
})

export const snippets: AutocompletePlugin = {
  applies (ctx) {
    const trigger = ctx.state.facet(autocompleteTriggerCharacter)
    // A valid snippet applies whenever the user typed a colon
    if (ctx.state.doc.sliceString(ctx.pos - 1, ctx.pos) !== trigger) {
      return false // Only applies after the user typed an #
    }

    const lineObject = ctx.state.doc.lineAt(ctx.pos)

    if (ctx.pos - lineObject.from === 1) {
      return ctx.pos // Start of Line, so perfectly fine
    }

    const charBefore = ctx.state.doc.sliceString(ctx.pos - 2, ctx.pos - 1)
    if (charBefore === ' ') {
      return ctx.pos // Valid char in front of the colon (so that `something:`
      // won't trigger)
    }

    return false
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    // NOTE: We need to create a new array, otherwise we're going to have an
    // emoji party after ten characters typed
    const entries = [...ctx.state.field(snippetsUpdateField).availableSnippets]
    if (ctx.state.field(configField).autocompleteSuggestEmojis) {
      entries.push(...emojis)
    }

    return entries.filter(entry => {
      if (entry.section === undefined) { // Snippets don't have a section
        return entry.label.toLowerCase().includes(query)
      }

      const inDetail = entry.detail?.toLowerCase().includes(query) ?? false

      if (typeof entry.info === 'string') {
        // Allow to search the tags as well that are part of the info
        return entry.info.toLowerCase().includes(query) || inDetail
      } else {
        return inDetail
      }
    })
  },
  fields: [snippetsUpdateField]
}

export function nextSnippet (target: EditorView): boolean {
  // Progresses to the next tabstop if there's one available
  const field = target.state.field(snippetsUpdateField, false)
  if (field === undefined) {
    return false
  }

  const { activeSelections } = field
  if (activeSelections.length === 0) {
    return false
  }

  target.dispatch({
    selection: activeSelections[0],
    effects: [
      shiftNextTabEffect.of(null),
      EditorView.scrollIntoView(activeSelections[0].main.from, { y: 'center' })
    ]
  })
  return true
}

export function abortSnippet (target: EditorView): boolean {
  // Removes all tabstops, if there are any
  const field = target.state.field(snippetsUpdateField, false)
  if (field === undefined) {
    return false
  }

  const ranges = field.activeSelections.length
  if (ranges > 0) {
    target.dispatch({ effects: snippetTabsEffect.of([]) })
    return true
  }

  return false
}
