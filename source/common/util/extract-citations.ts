/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractCitations function
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function can be used to extract citations from a piece
 *                  of Markdown text as closely to the implementation of Pandoc
 *                  Citeproc as possible. This function cannot guarantee full
 *                  compliance because I honestly can't read Haskell. However,
 *                  the documentation is quite extensive, so I orient myself at
 *                  those.
 *
 * END HEADER
 */

/**
 * The locatorLabels have been sourced from the Citr library. Basically it's just
 * a map with valid CSL locator labels and an array of possible natural labels
 * which a user might want to write (instead of the standardized labels).
 *
 * @var {{ [key: string]: string[] }}}
 */
const locatorLabels: Record<string, string[]> = {
  book: [ 'Buch', 'Bücher', 'B.', 'book', 'books', 'bk.', 'bks.', 'livre', 'livres', 'liv.' ],
  chapter: [ 'Kapitel', 'Kap.', 'chapter', 'chapters', 'chap.', 'chaps', 'chapitre', 'chapitres' ],
  column: [ 'Spalte', 'Spalten', 'Sp.', 'column', 'columns', 'col.', 'cols', 'colonne', 'colonnes' ],
  figure: [ 'Abbildung', 'Abbildungen', 'Abb.', 'figure', 'figures', 'fig.', 'figs' ],
  folio: [ 'Blatt', 'Blätter', 'Fol.', 'folio', 'folios', 'fol.', 'fols', 'fᵒ', 'fᵒˢ' ],
  issue: [ 'Nummer', 'Nummern', 'Nr.', 'number', 'numbers', 'no.', 'nos.', 'numéro', 'numéros', 'nᵒ', 'nᵒˢ' ],
  line: [ 'Zeile', 'Zeilen', 'Z', 'line', 'lines', 'l.', 'll.', 'ligne', 'lignes' ],
  note: [ 'Note', 'Noten', 'N.', 'note', 'notes', 'n.', 'nn.' ],
  opus: [ 'Opus', 'Opera', 'op.', 'opus', 'opera', 'opp.' ],
  page: [ 'Seite', 'Seiten', 'S.', 'page', 'pages', 'p.', 'pp.' ],
  paragraph: [ 'Absatz', 'Absätze', 'Abs.', '¶', '¶¶', 'paragraph', 'paragraphs', 'para.', 'paras', 'paragraphe', 'paragraphes', 'paragr.' ],
  part: [ 'Teil', 'Teile', 'part', 'parts', 'pt.', 'pts', 'partie', 'parties', 'part.' ],
  section: [ 'Abschnitt', 'Abschnitte', 'Abschn.', '§', '§§', 'section', 'sections', 'sec.', 'secs', 'sect.' ],
  'sub verbo': [ 'sub verbo', 'sub verbis', 's.&#160;v.', 's.&#160;vv.', 's.v.', 's.vv.' ],
  verse: [ 'Vers', 'Verse', 'V.', 'verse', 'verses', 'v.', 'vv.', 'verset', 'versets' ],
  volume: [ 'Band', 'Bände', 'Bd.', 'Bde.', 'volume', 'volumes', 'vol.', 'vols.' ]
}

/**
 * Citation detection: The first alternative matches "full" citations surrounded
 * by square brackets, whereas the second one matches in-text citations,
 * optionally with suffixes.
 *
 * * Group 1 matches regular "full" citations
 * * Group 2 matches in-text citations (not surrounded by brackets)
 * * Group 3 matches optional square-brackets suffixes to group 2 matches
 *
 * For more information, see https://pandoc.org/MANUAL.html#extension-citations
 *
 * @var {RegExp}
 */
const citationRE = /(?:\[([^[\]]*@[^[\]]+)\])|(?<=\s|^|(-))(?:@([\p{L}\d_][^\s]*[\p{L}\d_]|\{.+\})(?: +\[(.*?)\])?)/gum

/**
 * I hate everything at this. This can match every single possible variation on
 * whatever the f*** you can possibly do within square brackets according to the
 * documentation. I opted for named groups for these because otherwise I have no
 * idea what I have been doing here.
 *
 * * Group prefix: Contains the prefix, ends with a dash if we should suppress the author
 * * Group citekey: Contains the actual citekey, can be surrounded in curly brackets
 * * Group explicitLocator: Contains an explicit locator statement. If given, we MUST ignore any form of locator in the suffix
 * * Group explicitLocatorInSuffix: Same as above, but not concatenated to the citekey
 * * Group suffix: Contains the suffix, but may start with a locator (if explicitLocator and explicitLocatorInSuffix are not given)
 *
 * @var {RegExp}
 */
const fullCitationRE = /(?<prefix>.+)?(?:@(?<citekey>[\p{L}\d_][^\s{]*[\p{L}\d_]|\{.+\}))(?:\{(?<explicitLocator>.*)\})?(?:,\s+(?:\{(?<explicitLocatorInSuffix>.*)\})?(?<suffix>.*))?/u

/**
 * This regular expression matches locator ranges, like the following:
 *
 * * 23-45, and further (here it matches up to, not including the comma)
 * * 45
 * * 15423
 * * 14235-12532
 * * 12-34, 23, 56
 * * 12, 23-14, 23
 * * 12, 54, 12-23
 * * 1, 1-4
 * * 3
 * * NEW NEW NEW: Now also matches Roman numerals as sometimes used in forewords!
 *
 * @var {RegExp}
 */
const locatorRE = /^(?:[\d, -]*\d|[ivxlcdm, -]*[ivxlcdm])/i

/**
 * This is the return interface from this module: It declares a from-to position
 * indicating where in the original Markdown string the citation has been found
 * and an array citations which contains the parsed CSL Items that can be passed
 * to citeproc-js.
 */
export interface CitePosition {
  // The start position of this citation
  from: number
  // The end position of this citation
  to: number
  // The full source of this citation
  source: string
  // True if the citation should be composite
  composite: boolean
  // The list of cite items in CSL JSON style
  citations: CiteItem[]
}

/**
 * This interface describes the potential return of the parseSuffix function. It
 * can return a locator, a label, and a suffix. More specifically, it will return
 * a label in any case, defaulting to "page", just like citeproc.
 */
interface CiteItemSuffix {
  locator: string|undefined
  label: string
  suffix: string|undefined
}

// This is the same interface from citeproc.d.ts, but since the unit tests do not
// load the ambient declaration files, we have to declare it here as well. Doesn't
// hurt the linter.
interface CiteItem {
  id: string
  locator?: string
  label?: string
  'suppress-author'?: boolean
  'author-only'?: boolean
  prefix?: string
  suffix?: string
}

/**
 * This takes a suffix and extracts optional label and locator from this. Pass
 * true for the containsLocator property to indicate to this function that what
 * it got was not a regular suffix with an optional locator, but an explicit
 * locator so it knows it just needs to look for an optional label.
 *
 * @param   {string}          suffix           The suffix to parse
 * @param   {boolean}         containsLocator  If true, forces parseSuffix to return a locator
 *
 * @return  {CiteItemSuffix}                   An object containing three optional properties locator, label, or suffix.
 */
function parseSuffix (suffix: string|undefined, containsLocator: boolean): CiteItemSuffix {
  const retValue: CiteItemSuffix = {
    locator: undefined,
    label: 'page',
    suffix: undefined
  }

  if (suffix === undefined) {
    return retValue
  }

  // Make sure the suffix does not start or end with spaces
  suffix = suffix.trim()

  // If there is a label, the suffix must start with it
  for (const label in locatorLabels) {
    for (const natural of locatorLabels[label]) {
      if (suffix.toLowerCase().startsWith(natural.toLowerCase())) {
        retValue.label = label
        if (containsLocator) {
          // The suffix actually is the full locator, we just had to extract
          // the label from it. There is no remaining suffix.
          retValue.locator = suffix.substr(natural.length).trim()
        } else {
          // The caller indicated that this is a regular suffix, so we must also
          // extract the locator from what is left after label extraction.
          retValue.suffix = suffix.substr(natural.length).trim()
          const match = locatorRE.exec(retValue.suffix)
          if (match !== null) {
            retValue.locator = match[0] // Extract the full match
            retValue.suffix = retValue.suffix.substr(match[0].length).trim()
          }
        }

        return retValue // Early exit
      }
    }
  }

  // If we're here, there was no explicit label given, but the caller has indicated
  // that this suffix MUST contain a locator. This means that the whole suffix is
  // the locator.
  if (containsLocator) {
    retValue.locator = suffix
  } else {
    // The caller has not indicated that the whole suffix is the locator, so it
    // can be at the beginning. We only accept simple page/number ranges here.
    // For everything, the user should please be more specific.
    const match = locatorRE.exec(suffix)
    if (match !== null) {
      retValue.locator = match[0] // Full match is the locator
      retValue.suffix = suffix.substr(match[0].length).trim() // The rest is the suffix.
    }
  }

  return retValue
}

/**
 * Extracts citations from a string of Markdown, similar to how Citeproc does it.
 *
 * @param   {string}          markdown  The Markdown to parse
 *
 * @return  {CitePosition[]}            An array containing every found citation
 */
export default function extractCitations (markdown: string): CitePosition[] {
  const retValue = []

  for (const match of markdown.matchAll(citationRE)) {
    let from = match.index! // Here we know index will be set
    let to = from + match[0].length
    const citations = []
    let composite = false // Is set to true for in-text citations

    const fullCitation: string|undefined = match[1]
    const inTextSuppressAuthor: string|undefined = match[2]
    const inTextCitation: string|undefined = match[3]
    const optionalSuffix: string|undefined = match[4]

    // If we have an in-text citation and we should suppress the author, the
    // match.index does NOT include the positive lookbehind, so we have to manually
    // shift "from" to one before.
    if (inTextSuppressAuthor !== undefined) {
      from--
    }

    if (fullCitation !== undefined) {
      // We have a lame, full citation.
      for (const citationPart of fullCitation.split(';')) {
        const match = fullCitationRE.exec(citationPart.trim())
        if (match === null) {
          continue // Faulty citation
        }

        // We explicitly cast groups since we have groups in our RegExp and as
        // such the groups object will be set.
        const thisCitation: CiteItem = {
          id: (match.groups as any).citekey.replace(/{(.+)}/, '$1'),
          prefix: undefined,
          locator: undefined,
          label: 'page',
          'suppress-author': false,
          suffix: undefined
        }

        // First, deal with the prefix. The speciality here is that it can
        // indicate if we should suppress the author.
        const rawPrefix: string|undefined = (match.groups as any).prefix
        if (rawPrefix !== undefined) {
          thisCitation['suppress-author'] = rawPrefix.trim().endsWith('-')
          if (thisCitation['suppress-author']) {
            thisCitation.prefix = rawPrefix.substring(0, rawPrefix.trim().length - 1).trim()
          } else {
            thisCitation.prefix = rawPrefix.trim()
          }
        }

        // Second, deal with the suffix. This one can be much more tricky than
        // the prefix. We have three alternatives where the locator may be
        // present: If we have an explicitLocator or an explicitLocatorInSuffix,
        // we should extract the locator from there and leave the actual suffix
        // untouched. Only if those two alternatives are not present, then we
        // have a look at the rawSuffix and extract a (potential) locator.
        const explicitLocator: string|undefined = (match.groups as any).explicitLocator
        const explicitLocatorInSuffix: string|undefined = (match.groups as any).explicitLocatorInSuffix
        const rawSuffix: string|undefined = (match.groups as any).suffix

        let suffixToParse
        let containsLocator = true
        if (explicitLocator === undefined && explicitLocatorInSuffix === undefined) {
          // Potential locator in rawSuffix. Only in this case should we overwrite
          // the suffix (hence the same if-condition below)
          suffixToParse = rawSuffix
          containsLocator = false
        } else if (explicitLocatorInSuffix !== undefined || explicitLocator !== undefined) {
          suffixToParse = explicitLocator ?? explicitLocatorInSuffix
          thisCitation.suffix = rawSuffix?.trim()
        }

        const { label, locator, suffix } = parseSuffix(suffixToParse, containsLocator)
        thisCitation.locator = locator

        if (label !== undefined) {
          thisCitation.label = label
        }

        if (explicitLocator === undefined && explicitLocatorInSuffix === undefined) {
          thisCitation.suffix = suffix
        } else if (suffix !== undefined && thisCitation.locator !== undefined) {
          // If we're here, we should not change the suffix, but parseSuffix may
          // have put something into the suffix return. If we're here, that will
          // definitely be a part of the locator.
          thisCitation.locator += suffix
        }

        citations.push(thisCitation)
      }
    } else {
      // We have an in-text citation, so we can take a shortcut
      composite = true
      citations.push({
        prefix: undefined,
        id: inTextCitation.replace(/{(.+)}/, '$1'),
        'suppress-author': inTextSuppressAuthor !== undefined,
        ...parseSuffix(optionalSuffix, false) // Populate more depending on the suffix
      })
    }

    // After all of our yadda yadda, push the citation
    retValue.push({ from, to, citations, composite, source: match[0] })
  }

  return retValue
}
