import enumLangFiles, { LangFileMetadata } from './enum-lang-files'
import findLangCandidates, { Candidate } from './find-lang-candidates'
import path from 'path'

/**
 * Returns metadata for a given translation file and provides a status code.
 * @param  {string} query         The language metadata is requested for (BCP 47 compatible)
 * @return {Object}               A language metadata object.
 */
export default function getLanguageFile (query: string): Candidate & LangFileMetadata {
  // First of all, create the fallback object.
  const fallback: Candidate & LangFileMetadata = {
    tag: 'en-US',
    status: 'fallback',
    path: path.join(__dirname, '/lang/en-US.json')
  }

  // Now we should have a list of all available dictionaries. Next, we need to
  // search for a best and a close match.
  let { exact, close } = findLangCandidates(query, enumLangFiles())

  if (exact !== undefined) {
    return exact
  } else if (close !== undefined) {
    return close
  } else {
    return fallback
  }
}
