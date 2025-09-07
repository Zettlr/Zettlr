/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        findLangCandidates
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Given a BCP-47 compatible language identifier and an array
 *                  of language-specific candidates, this function will return
 *                  a candidate with an exact match regarding the language
 *                  identifier and/or a close match.
 *
 * END HEADER
 */

import * as bcp47 from 'bcp-47/index.js'

export interface LanguageCandidates<T> {
  exact: Candidate & T|undefined
  close: Candidate & T|undefined
}

export interface Candidate {
  tag: string
  status?: 'exact'|'close'|'fallback'
}

/**
 * Status mode that describes a returned language metadata object as an exact
 * match to the query.
 * @type {String}
 */
const EXACT = 'exact'

/**
  * Status mode that describes a returned language metadata object as a close
  * match to the query.
  * @type {String}
  */
const CLOSE = 'close'

/**
 * Returns an object containing a best (that is: exact) and a close match by checking
 * the BCP-47 compatible lang against all provided candidates. Candidates will be
 * modified in-place with a "status" property you can check. Candidates may also
 * contain arbitrary additional keys as long as they expose a "tag" property.
 *
 * @param   {string}                 lang        The language to check (e.g. en-US)
 * @param   {Array<T & Candidate>}   candidates  A list of candidates implementing the Candidate interface
 *
 * @return  {LanguageCandidates<T>}              An exact and/or a close match from the candidates array.
 */
export default function findLangCandidates<T> (lang: string, candidates: Array<T & Candidate>): LanguageCandidates<T> {
  const parsedLang = bcp47.parse(lang)

  let bestMatch
  let closeMatch
  for (let candidate of candidates) {
    // Re-convert the language tag
    let cand = bcp47.parse(candidate.tag)

    // Every candidate must under all circumstances match the language.
    if (cand.language !== parsedLang.language) {
      continue
    }

    // If given, the extended subtag must also be given.
    if (parsedLang.extendedLanguageSubtags.length > 0) {
      if (parsedLang.extendedLanguageSubtags !== cand.extendedLanguageSubtags) {
        // Nope, sorry.
        continue
      }
    }

    // If given, the script must also match (why? Pretty easy: If the user
    // wants to spellcheck his/her Serbian written in Latin script, he would
    // not consider the original script "close", but rather far from what s/he
    // wants.) We check this against the length of the original language's
    // variant, because if there are no variants requested, then we assume the
    // user does not care which variant s/he gets.
    if (parsedLang.script !== '' && parsedLang.script !== cand.script) {
      continue
    }

    // Now let's find out if this candidate is only close, or even "best"!
    let candidateType = 'close'

    // Every language that has made it until here comes into consideration for a
    // close match.
    if (cand.region === parsedLang.region &&
    cand.variants.length === parsedLang.variants.length &&
    cand.extensions.length === parsedLang.extensions.length) {
      candidateType = 'best'
    }

    // Now determine where we should write this baby.
    if (candidateType === 'best') {
      bestMatch = candidate
      break
    } else if (candidateType === 'close' && closeMatch === undefined) {
      closeMatch = candidate
      // Don't break here, because maybe the best match comes afterwards in the list
    }
  }

  if (bestMatch !== undefined) {
    bestMatch.status = EXACT
  }
  if (closeMatch !== undefined) {
    closeMatch.status = CLOSE
  }

  return {
    exact: bestMatch,
    close: closeMatch
  }
}
