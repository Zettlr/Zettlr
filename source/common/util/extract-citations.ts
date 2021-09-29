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
const citationRE = /(?:\[([^[\]]*@[^[\]]+)\])|(?<=\s|^)(?:@([\p{L}\d_][^\s]*[\p{L}\d_]|\{.+\})(?:\s+\[(.*?)\])?)/gum

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

interface CitePosition {
  from: number
  to: number
  citations: CiteItem[]
}

interface CiteItemSuffix {
  locator?: string
  label?: string
  suffix?: string
}

function parseSuffix (suffix?: string): CiteItemSuffix {
  if (suffix === undefined) {
    return {}
  }

  return {}
}

export default function extractCitations (markdown: string): CitePosition[] {
  const retValue = []

  for (const match of markdown.matchAll(citationRE)) {
    const from = match.index as number // Here we know index will be set
    const to = from + match[0].length
    const citations = []

    const fullCitation: string|undefined = match[1]
    const inTextSuppressAuthor: string|undefined = match[2]
    const inTextCitation: string|undefined = match[3]
    const optionalSuffix: string|undefined = match[4]

    if (fullCitation !== undefined) {
      // We have a lame, full citation.
      for (const citationPart of fullCitation.split(';')) {
        const match = fullCitationRE.exec(citationPart)
        if (match === null) {
          continue // Faulty citation
        }

        // We explicitly cast groups since we have groups in our RegExp and as
        // such the groups object will be set.
        const citekey: string = (match.groups as any).citekey
        const explicitLocator: string|undefined = (match.groups as any).explicitLocator
        const explicitLocatorInSuffix: string|undefined = (match.groups as any).explicitLocatorInSuffix
        const prefix: string|undefined = (match.groups as any).prefix
        const suffix: string|undefined = (match.groups as any).suffix

        let actualLocator = ''
        if (explicitLocator === undefined && explicitLocatorInSuffix === undefined) {
          // TODO: Locator may be in suffix
        } else if (explicitLocatorInSuffix !== undefined) {
          actualLocator = explicitLocatorInSuffix
        } else if (explicitLocator !== undefined) {
          actualLocator = explicitLocator
        }

        citations.push({
          id: citekey.replace(/{(.+)}/, '$1'),
          prefix: prefix,
          locator: actualLocator,
          label: 'page', // TODO!
          'suppress-author': prefix?.endsWith('-') === true,
          suffix: suffix
        })
      }
    } else {
      // We have an in-text citation, so we can take a shortcut
      citations.push({
        id: inTextCitation.replace(/{(.+)}/, '$1'),
        'suppress-author': inTextSuppressAuthor !== undefined,
        ...parseSuffix(optionalSuffix) // Populate more depending on the suffix
      })
    }

    // After all of our yadda yadda, push the citation
    retValue.push({ from, to, citations })
  }

  return retValue
}

/*

NOTE: I have tested the citationRE with the following input:

Blah blah [@doe99; @smith2000; @smith2004].

Blah blah [see @doe99, pp. 33-35 and *passim*; @smith04, chap. 1].

[@{https://example.com/bib?name=foobar&date=2000}, p. 33]

[@smith{ii, A, D-Z}, with a suffix]
[@smith, {pp. iv, vi-xi, (xv)-(xvii)} with suffix here]
[@smith{}, 99 years later]

Smith says blah [-@smith04].

One other citation where Smith says -@smith04

@smith04 says blah.

@smith04 [p. 33] says blah.

@{https://example.com/bib?name=foobar&date=2000} says blah.

@{https://example.com/bib?name=foobar&date=2000} [p. 33] says blah.

If group 1 matches, it's a boring regular full citation
If group 2 matches, it's an in-text citation and we must suppress author
If group 3 matches, it's the citekey of an in-text citation
If group 4 matches, it's the optional suffix of an in-text citation
*/

/*

NOTE: I have tested the fullCitationRE with the following input:

@doe99
@smith2000
@smith2004

see @doe99, pp. 33-35 and *passim*
@smith04, chap. 1

@{https://example.com/bib?name=foobar&date=2000}, p. 33

@smith{ii, A, D-Z}, with a suffix
@smith, {pp. iv, vi-xi, (xv)-(xvii)} with suffix here
@smith{}, 99 years later

-@smith04
*/
