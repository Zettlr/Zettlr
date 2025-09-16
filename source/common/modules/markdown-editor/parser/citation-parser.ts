/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Citation Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This inline parser adds citation elements to the Lezer tree.
 *                  It attempts to closely follow the allowed syntax from the
 *                  Pandoc manual, and mounts nodes for citation prefixes,
 *                  suffixes, the cite key, locators, the suppress author flag
 *                  and the various formatting characters required for
 *                  citations.
 *
 * END HEADER
 */

import { type InlineParser, type Element as MDElement } from '@lezer/markdown'

/**
 * The locatorLabels have been sourced from the Citr library. Basically it's
 * just a map with valid CSL locator labels and an array of possible natural
 * labels which a user might want to write (instead of the standardized labels).
 * We provide them in lowercase here to match citation parts against them case-
 * insensitively.
 *
 * @var {{ [key: string]: string[] }}}
 */
const locatorLabels: Record<string, string[]> = {
  book: [ 'Buch', 'Bücher', 'B.', 'book', 'books', 'bk.', 'bks.', 'livre', 'livres', 'liv.' ].map(e => e.toLowerCase()),
  chapter: [ 'Kapitel', 'Kap.', 'chapter', 'chapters', 'chap.', 'chaps', 'chapitre', 'chapitres' ].map(e => e.toLowerCase()),
  column: [ 'Spalte', 'Spalten', 'Sp.', 'column', 'columns', 'col.', 'cols', 'colonne', 'colonnes' ].map(e => e.toLowerCase()),
  figure: [ 'Abbildung', 'Abbildungen', 'Abb.', 'figure', 'figures', 'fig.', 'figs' ].map(e => e.toLowerCase()),
  folio: [ 'Blatt', 'Blätter', 'Fol.', 'folio', 'folios', 'fol.', 'fols', 'fᵒ', 'fᵒˢ' ].map(e => e.toLowerCase()),
  issue: [ 'Nummer', 'Nummern', 'Nr.', 'number', 'numbers', 'no.', 'nos.', 'numéro', 'numéros', 'nᵒ', 'nᵒˢ' ].map(e => e.toLowerCase()),
  line: [ 'Zeile', 'Zeilen', 'Z', 'line', 'lines', 'l.', 'll.', 'ligne', 'lignes' ].map(e => e.toLowerCase()),
  note: [ 'Note', 'Noten', 'N.', 'note', 'notes', 'n.', 'nn.' ].map(e => e.toLowerCase()),
  opus: [ 'Opus', 'Opera', 'op.', 'opus', 'opera', 'opp.' ].map(e => e.toLowerCase()),
  page: [ 'Seite', 'Seiten', 'S.', 'page', 'pages', 'p.', 'pp.' ].map(e => e.toLowerCase()),
  paragraph: [ 'Absatz', 'Absätze', 'Abs.', '¶', '¶¶', 'paragraph', 'paragraphs', 'para.', 'paras', 'paragraphe', 'paragraphes', 'paragr.' ].map(e => e.toLowerCase()),
  part: [ 'Teil', 'Teile', 'part', 'parts', 'pt.', 'pts', 'partie', 'parties', 'part.' ].map(e => e.toLowerCase()),
  section: [ 'Abschnitt', 'Abschnitte', 'Abschn.', '§', '§§', 'section', 'sections', 'sec.', 'secs', 'sect.' ].map(e => e.toLowerCase()),
  'sub verbo': [ 'sub verbo', 'sub verbis', 's.&#160;v.', 's.&#160;vv.', 's.v.', 's.vv.' ].map(e => e.toLowerCase()),
  verse: [ 'Vers', 'Verse', 'V.', 'verse', 'verses', 'v.', 'vv.', 'verset', 'versets' ].map(e => e.toLowerCase()),
  volume: [ 'Band', 'Bände', 'Bd.', 'Bde.', 'volume', 'volumes', 'vol.', 'vols.' ].map(e => e.toLowerCase())
}

// Compress the locator labels into a 1d string list for easier access.
const allValidLocatorLabels = Object.values(locatorLabels).flatMap(x => x)

// Determine the longest locator length (so that we know below how many
// characters we must extract from the inline context).
const maxLocatorLabelLength = Math.max(...allValidLocatorLabels.map(x => x.length))

/**
 * I strongly believe that Marijn's approach of using character codepoints
 * instead of the characters themselves has a good reason, so we are going to
 * stick to the intended usage of the parser. However, I am a human and need
 * some labels for the numbers. This map essentially maps a few relevant code
 * points to their key names.
 */
const CHAR = {
  TAB: 9,
  LF: 10,
  CR: 13,
  SPACE: 32,
  BRACE_OPEN: 40,
  COMMA: 44,
  HYPHEN: 45,
  SEMICOLON: 59,
  AT: 64,
  BRACKET_OPEN: 91,
  BRACKET_CLOSE: 93,
  CURLY_OPEN: 123,
  CURLY_CLOSE: 125
}

// Contains character codes for upper/lower case roman numerals (i, v, x, c, d,
// m and I, V, X, C, D, M).
const ROMAN_NUMERAL_CODES = [ 73, 105, 86, 118, 88, 120, 67, 99, 68, 100, 77, 109 ]

export const citationParser: InlineParser = {
  name: 'citations',
  // This inline parser must be run before the Link parser, as
  // `[@citekey, p. 123]` will otherwise be detected as a link.
  before: 'Link',
  // NOTE: I discovered that elements MUST UNDER ALL CIRCUMSTANCES be inserted
  // SORTED. The library will omit any elements added whose from/to positions do
  // not match up with the rest of the elements. (This is especially important
  // for finishing the prefix below).
  parse: (ctx, next, pos) => {
    // Any potentially valid citation starts with an opening bracket, an @, or
    // a hyphen.
    if (next !== CHAR.AT && next !== CHAR.BRACKET_OPEN && next !== CHAR.HYPHEN) {
      return -1
    }

    
    // Ensure the character before `pos` is valid. NOTE: The InlineContext may
    // include newlines, since single newlines are considered part of the same
    // line due to the hard wrapping rule.
    const prevChar = ctx.char(pos - 1)
    const validBefore = Number.isNaN(prevChar) || [ CHAR.BRACE_OPEN, CHAR.LF, CHAR.CR, CHAR.TAB, CHAR.SPACE ].includes(prevChar)
    if (!validBefore) {
      return -1
    }

    // Quick additional check to save us some headaches, because if `next` is a
    // hyphen, it MUST be followed by an @ to be considered a valid citation.
    if (next === CHAR.HYPHEN && ctx.char(pos + 1) !== CHAR.AT) {
      return -1
    }

    // Now we have two options: If the character was either an @ or a hyphen,
    // we are dealing with an inline-citation. Otherwise, we have a regular
    // in-text citation.

    // What we essentially do below is implement a basic character-parser that
    // collects the various elements of a citation in `parts`, and emits a full
    // citation at the end.
    // NOTE: Each citation has two named elements in a specific order: First a
    // citekey, second an optional locator. Anything before the citekey is by
    // definition the prefix, and anything after the locator (if present,
    // otherwise after the citekey) up until the next semicolon or end bracket
    // is by definition considered suffix.

    // We collect all (non-nesting) children in this array.
    const parts: MDElement[] = []

    // This is necessary, because even a citation with zero proper citekeys will
    // otherwise be detected as valid.
    let citekeysFound = 0

    // We often need to ensure that we do not overrun the maximum inline context
    // length.
    const ctxEndPos = ctx.offset + ctx.text.length

    // Preset the current position in our parsing
    let i = pos

    // First, deal with regular in-text citations, as these are more complex.
    if (next === CHAR.BRACKET_OPEN) {
      // NOTE the increment. These are used in several parts to keep the code a
      // bit cleaner. I have avoided using `i++`, and instead used only `++i` to
      // signal that we are shifting the index.
      parts.push(ctx.elt('CitationMark', i, ++i))

      // Set up the state. We have to find two elements within each citation --
      // a citekey, and an optional locator. Prefix and suffix can be computed
      // from that. We ignore everything between citekey and locator.
      let citekeyStart = -1
      let citekeyEnd = -1
      let citekeyInBrackets = false

      let locatorStart = -1
      let locatorEnd = -1
      let locatorInBrackets = false

      // We need this to account for multiple citekeys. It allows us to properly
      // insert prefix-nodes in multi-citekey-citations.
      let citationPartStart = i

      // Now go through the character stream and parse the citation parts.
      for (/* i is at the correct position */; i < ctxEndPos; i++) {
        // NOTE NOTE: Since the individual parsing rules are slightly more
        // complex, I could not use a switch statement, nor an if-else branching
        // since both was less readable than I have wished for. So instead I
        // use individual if-branches that usually end in a `continue` or break.
        // Note that some of those branches do not, meaning they are essentially
        // "fall-through."

        // Iteration setup
        const prevCh = ctx.char(i - 1) // Might be Number.NaN
        const ch = ctx.char(i)
        const nextCh = ctx.char(i + 1) // Might be Number.NaN

        if (ch === CHAR.SEMICOLON || ch === CHAR.BRACKET_CLOSE) {
          // Regardless of whether another citation part starts or the entire
          // citation is now finished, we must close any opened and unfinished
          // nodes here.
          if (citekeyStart < 0) {
            // This happens with bracketed text that does not contain an @-sign.
            // Up until here, those things will indeed be considered valid, but
            // we have to explicitly return here to avoid any errors later on.
            return -1
          } else if (locatorStart > -1 && locatorEnd < 0) {
            // Locator reaches until the end of the part
            parts.push(ctx.elt('CitationLocator', locatorStart, i))
          } else if (locatorEnd > -1 && locatorEnd < i) {
            // Locator has been finalized -> suffix.
            parts.push(ctx.elt('CitationSuffix', locatorEnd, i))
          } else if (citekeyEnd < 0) {
            // Non-bracketed citekey with no locator and no suffix.
            parts.push(ctx.elt('CitationCitekey', citekeyStart, i))
            citekeysFound++
          } else if (citekeyEnd < i) {
            // No locator, but there were characters after the citekey -> suffix
            parts.push(ctx.elt('CitationSuffix', citekeyEnd, i))
          }
        }

        if (ch === CHAR.SEMICOLON) {
          // Multiple citations are divided by semicolons, so afterwards a new
          // citation part starts -> reset the state.
          citekeyStart = -1
          citekeyEnd = -1
          citekeyInBrackets = false
          locatorStart = -1
          locatorEnd = -1
          locatorInBrackets = false
          citationPartStart = i + 1 // Next citation starts after the semicolon.
          parts.push(ctx.elt('CitationMark', i, i + 1))
          continue
        }
        
        if (ch === CHAR.BRACKET_CLOSE) {
          // End-condition -- marks the finish of the entire parsing.
          parts.push(ctx.elt('CitationMark', i, ++i))
          break // Stop iterating; citation is between pos and i.
        }
        
        if (ch === CHAR.HYPHEN && citekeyStart < 0 && nextCh === CHAR.AT) {
          // Suppress-author-flag: Before citekey starts, must be followed by @
          if (i > citationPartStart) {
            // Add prefix node. Note that we have to add nodes in proper sorted
            // order.
            parts.push(ctx.elt('CitationPrefix', citationPartStart, i))
          } 
          parts.push(ctx.elt('CitationSuppressAuthorFlag', i, i + 1))
          continue
        }
        
        if (ch === CHAR.AT && citekeyStart < 0 && [ CHAR.SPACE, CHAR.HYPHEN, CHAR.BRACKET_OPEN ].includes(prevCh)) {
          // Start citekey (must be preceded by [, a space, or -)
          if (i > citationPartStart && prevCh !== CHAR.HYPHEN) {
            // Add prefix node. Note that we have to add nodes in proper sorted
            // order.
            parts.push(ctx.elt('CitationPrefix', citationPartStart, i))
          }

          parts.push(ctx.elt('CitationAtSign', i, i + 1))
          citekeyStart = i + 1 // Key excludes the "@"
          continue
        }
        
        if (citekeyStart > -1 && citekeyEnd < 0) {
          // We are inside the citekey
          if (i === citekeyStart && ch === CHAR.CURLY_OPEN) {
            citekeyInBrackets = true // Citekey is in brackets
            parts.push(ctx.elt('CitationMark', i, i + 1))
            citekeyStart++
          } else if (citekeyInBrackets && ch === CHAR.CURLY_CLOSE) {
            // Citekey is in brackets, and we found the closing bracket
            parts.push(ctx.elt('CitationCitekey', citekeyStart, i))
            citekeysFound++
            parts.push(ctx.elt('CitationMark', i, i + 1))
            citekeyEnd = i
          } else if (!/[\w:\.#$%&\-+?<>~/]/.test(String.fromCharCode(ch))) { // TODO: I would like to avoid string conversion here.
            // Regular citekey without brackets -> check for disallowed characters
            // Allowed according to the Pandoc manual are: starts with letter, digit, or _, and contains only a-z0-9 and (:.#$%&-+?<>~/)
            // NOTE: We are allowing trailing punctuation marks. My energy is, after all, finite.
            parts.push(ctx.elt('CitationCitekey', citekeyStart, i))
            citekeysFound++
            citekeyEnd = i

            // We are now one position AFTER the cite key. We have to account
            // for the fact that a locator does not need to be separated from
            // the citekey with a space.
            if (ch === CHAR.CURLY_OPEN) {
              parts.push(ctx.elt('CitationMark', i, i + 1))
              locatorStart = i + 1
              locatorInBrackets = true
            }
          }
          // Else: still inside a citekey, so just swallow the character
          continue
        }

        // Now we're past the citekey. There's only a suffix and a locator
        // afterwards. If we find a locator, use it; if we don't, everything
        // else is suffix. NOTE: If there is a locator, anything between citekey
        // end and locator start is going to be ignored.
        if (citekeyEnd > -1 && locatorStart < 0 && ch === CHAR.CURLY_OPEN) {
          // Locator is present; contained within curly brackets.
          locatorStart = i + 1
          locatorInBrackets = true
          parts.push(ctx.elt('CitationMark', i, i + 1))
          continue
        }
        
        // Code points 48-57 are digits. Implicit and explicit locators must be
        // preceded by a space, bracketed locators do not.
        if (citekeyEnd > -1 && locatorStart < 0 && prevCh === CHAR.SPACE && ((ch >= 48 && ch <= 57) || ROMAN_NUMERAL_CODES.includes(ch))) {
          // Found a number -> begin implicit locator
          locatorStart = i
          continue
        }

        // Unfortunately, for explicit locators we have to perform string
        // comparison, so we need to extract the actual text here.
        const slice = ctx.slice(i, Math.max(i + maxLocatorLabelLength, ctxEndPos)).toLowerCase()
        // NOTE that we require each label to be followed by a space
        const explicitLabel = allValidLocatorLabels.find(x => slice.startsWith(x + ' '))
        if (citekeyEnd > -1 && locatorStart < 0 && prevCh === CHAR.SPACE && explicitLabel !== undefined) {
          // Found a valid locator label -> begin explicit locator
          locatorStart = i
          // Move i forward until after the space so that the implicit locator
          // logic can take over. This way, regardless of how a locator starts,
          // its end will be found the same way.
          i += explicitLabel.length + 1
          continue
        }
        
        if (locatorStart > -1 && locatorEnd < 0) {
          // We are inside the locator
          if (locatorInBrackets && ch === CHAR.CURLY_CLOSE) {
            // Curly brackets locators are easy
            locatorEnd = i
            parts.push(ctx.elt('CitationLocator', locatorStart, locatorEnd))
            parts.push(ctx.elt('CitationMark', i, i + 1))
            continue
          } else if (((ch < 48 || ch > 57) && !ROMAN_NUMERAL_CODES.includes(ch) && ch !== CHAR.HYPHEN)) {
            // Both implicit and explicit locators end if we no longer have
            // valid (implicit) locator characters.
            locatorEnd = i
            parts.push(ctx.elt('CitationLocator', locatorStart, locatorEnd))
            continue
          }
        }
      }
    } else {
      // Inline-citation. That one is easier, albeit not without issues.
      // However, until the optional locator/suffix, we can essentially move
      // linearly through the character stream.
      if (next === CHAR.HYPHEN) {
        parts.push(ctx.elt('CitationSuppressAuthorFlag', i, ++i))
      }

      // We know that the next character is an @
      parts.push(ctx.elt('CitationAtSign', i, ++i))

      let citekeyStart = i

      // Now we essentially just swallow every allowed character for the citekey.
      if (ctx.char(i) === CHAR.CURLY_OPEN) {
        citekeyStart++
        parts.push(ctx.elt('CitationMark', i, ++i))
        while (i < ctxEndPos && ctx.char(i) !== CHAR.CURLY_CLOSE) {
          i++
        }

        if (ctx.char(i) !== CHAR.CURLY_CLOSE) {
          return -1 // Curly bracket didn't close
        }

        parts.push(ctx.elt('CitationCitekey', citekeyStart, i))
        citekeysFound++
        parts.push(ctx.elt('CitationMark', i, ++i))
      } else {
        while (i < ctxEndPos && /[\w:\.#$%&\-+?<>~/]/.test(String.fromCharCode(ctx.char(i)))) {
          i++
        }

        // Note that we need not check for whether i = ctxEndPos, since the
        // citation is allowed to be the last thing within the inline context.
        parts.push(ctx.elt('CitationCitekey', citekeyStart, i))
        citekeysFound++
      }

      // At this point we are guaranteed to have a citekey. Next, check if there
      // is a locator/suffix bracket. Must be separated from the citekey by a
      // space.
      if (i < ctxEndPos - 1 && ctx.char(i) === CHAR.SPACE && ctx.char(i + 1) === CHAR.BRACKET_OPEN) {
        // Yes, there seems to be a locator bracket.

        // Remember the end of the citekey if the bracket turns out to not be
        // closed, so we can reset i and the citation element will be correct.
        const citekeyEnd = i

        // In this branch, we only temporarliy collect all elements, since we do
        // not yet know if the bracket actually closes. If it doesn't, anything
        // until the citekey is still valid, but the rest must be thrown away.
        const temporaryParts: MDElement[] = []

        i++
        temporaryParts.push(ctx.elt('CitationMark', i, ++i))
        let intextSuffixStart = i

        // Does the remaining slice start with an explicit locator label?
        let locatorStart = -1
        const slice = ctx.slice(i, Math.max(i + maxLocatorLabelLength, ctxEndPos)).toLowerCase()
        // NOTE that we require each label to be followed by a space
        const explicitLabel = allValidLocatorLabels.find(x => slice.startsWith(x + ' '))
        if (explicitLabel !== undefined) {
          // Found a valid locator label -> begin explicit locator
          locatorStart = i
          // Move i forward until after the space so that the implicit locator
          // logic can take over
          i += explicitLabel.length + 1
        } else if (((ctx.char(i) >= 48 && ctx.char(i) <= 57) || ROMAN_NUMERAL_CODES.includes(ctx.char(i)))) {
          // Found a valid locator character -> begin implicit locator
          locatorStart = i
        }

        if (locatorStart > -1) {
          // There was an implicit or explicit locator; so now we just have to
          // move i forward until no more valid locator chars exist
          while (i < ctxEndPos && ((ctx.char(i) >= 48 && ctx.char(i) <= 57) || ROMAN_NUMERAL_CODES.includes(ctx.char(i)) || ctx.char(i) === CHAR.HYPHEN)) {
            i++
          }

          temporaryParts.push(ctx.elt('CitationLocator', locatorStart, i))
          intextSuffixStart = i
        } // Else: No locator, so essentially everything is suffix.

        // Finally, we just have to find the closing bracket to complete the
        // inline suffix.
        while (i < ctxEndPos && ctx.char(i) !== CHAR.BRACKET_CLOSE) {
          i++
        }

        if (ctx.char(i) === CHAR.BRACKET_CLOSE) {
          // First, commit the temporary collected parts ...
          parts.push(...temporaryParts)
          // ... add the suffix (intextSuffixStart is sensitive to locator) ...
          parts.push(ctx.elt('CitationSuffix', intextSuffixStart, i))
          // ... and close off with the close marker
          parts.push(ctx.elt('CitationMark', i, ++i))
        } else {
          // Bracket did not actually close -> reset i
          i = citekeyEnd
        }
      } // else: No locator/suffix bracket, keep the found citekey.
    }

    // Essentially, this `if` branch requires that a valid citation must have
    // at least one part and at least one citekey. This is just a final sanity
    // check as otherwise bracketed text would be considered a citation. In
    // several parts of the code we assume that a citation MUST have at least
    // one citekey.
    if (parts.length > 0 && citekeysFound > 0) {
      // Final step: Compose the full citation element.
      return ctx.addElement(ctx.elt('Citation', pos, i, parts))
    } else {
      return -1
    }
  }
}
