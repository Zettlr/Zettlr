/**
 * BEGIN HEADER
 *
 * Contains:        Internationalization functions
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains several functions, not classes, that help
 *                  with the internationalization of the app.
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')
const bcp47 = require('bcp-47')
const { app } = require('electron')
const isDir = require('./util/is-dir')
const isFile = require('./util/is-file')

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
 * Status mode that describes a returned language metadata object as a fallback
 * to the query, as the query has not been found.
 * @type {String}
 */
const FALLBACK = 'fallback'

/**
 * This function loads a language JSON file specified by lang into the global i18n-object
 * It must be used only in the main process; renderer processes must call loadI18nRenderer() instead.
 * @param  {String} [lang='en-US'] The language to be loaded
 * @return {Object}                The language metadata object.
 */
function loadI18nMain (lang = 'en-US') {
  let file = getLanguageFile(lang) // Will return a working path

  // Cannot do this asynchronously, because it HAS to be loaded directly
  // after the config and written into the global object
  global.i18nRawData = fs.readFileSync(file.path, 'utf8')
  global.i18n = JSON.parse(global.i18nRawData)

  // Also load the en-US fallback as we can be sure this WILL both stay
  // up to date and will be understood by most people.
  let fallback = getLanguageFile('en-US') // Will return either the shipped or updated file
  global.i18nFallbackRawData = fs.readFileSync(fallback.path, 'utf8')
  global.i18nFallback = JSON.parse(global.i18nFallbackRawData)

  return file
}

/**
 * This translates a given identifier string into the loaded language
 * @param  {String} string A dot-delimited string containing the translatable
 * @param  {any} args   Zero or more strings that will replace %s-placeholders in the string
 * @return {String}        The translation with all potential replacements applied.
 */
function trans (string, ...args) {
  if (string.indexOf('.') === -1) {
    // Wtf? But alright, return the string and log an error
    global.log.warning('The translation string was malformed: ' + string + '!')
    return string
  }

  // Split the string by dots
  let str = string.split('.')
  // The function will be called from line 88 as a fallback
  // if a given string couldn't be found.
  let transString = global.i18n
  let skipFallback = false
  if (args[0] === true) {
    transString = global.i18nFallback
    skipFallback = true // Prevent an endless loop if the string is also missing from fallback
    args.splice(0, 1) // Remove the first argument as it's only the injected "true"
  }

  for (let obj of str) {
    if (transString.hasOwnProperty(obj)) {
      transString = transString[obj]
    } else {
      // Something went wrong and the requested translation string was
      // not found -> fall back and just return the original string
      return (global.config.get('debug') || skipFallback) ? string : trans(string, ...[true].concat(args))
    }
  }

  // There was an additional attribute missing (there is a whole object
  // in the variable) -> just return the string
  if (typeof transString !== 'string') return string

  for (let a of args) {
    transString = transString.replace('%s', a) // Always replace one %s with an arg
  }

  return transString
}

/**
 * Returns metadata for a given dictionary dir and provides a status code.
 * @param  {string} query         The language metadata is requested for (BCP 47 compatible)
 * @return {Object}               A language metadata object.
 */
function getDictionaryFile (query) {
  // First of all, create the fallback object.
  let ret = {
    'tag': 'en-US',
    'status': FALLBACK,
    'aff': path.join(__dirname, 'dict/en-US/en-US.aff'),
    'dic': path.join(__dirname, 'dict/en-US/en-US.dic')
  }

  let lang = bcp47.parse(query)
  if (!lang) throw new Error(`Request for BCP 47 compatible dictionary file was malformed: ${query}`)

  // Now we should have a list of all available dictionaries. Next, we need to
  // search for a best and a close match.
  let { exact, close } = findLangCandidates(lang, enumDictFiles())

  if (exact) return exact
  if (close) return close
  return ret
}

/**
 * Returns metadata for a given translation file and provides a status code.
 * @param  {string} query         The language metadata is requested for (BCP 47 compatible)
 * @return {Object}               A language metadata object.
 */
function getLanguageFile (query) {
  // First of all, create the fallback object.
  let ret = {
    'tag': 'en-US',
    'status': FALLBACK,
    'path': path.join(__dirname, '/lang/en-US.json')
  }

  let lang = bcp47.parse(query)
  if (!lang) throw new Error(`Request for BCP 47 compatible dictionary file was malformed: ${query}`)

  // Now we should have a list of all available dictionaries. Next, we need to
  // search for a best and a close match.
  let { exact, close } = findLangCandidates(lang, enumLangFiles())

  if (exact) return exact
  if (close) return close
  return ret
}

/**
 * Returns an object containing a best (as is: exact) and a close (as is: not
 * exactly what was requested) match by checking lang against all provided
 * candidates.
 * @param  {Object} lang       A bcp47.parse() schema
 * @param  {Array} candidates An array containing all objects to check. Must expose a "tag"-property
 * @return {Object}            An object containing "close" and "exact" properties, which may be undefined.
 */
function findLangCandidates (lang, candidates) {
  if (typeof lang === 'string') {
    lang = bcp47.parse(lang)
  }

  let bestMatch
  let closeMatch
  for (let candidate of candidates) {
    // Re-convert the language tag
    let cand = bcp47.parse(candidate.tag)

    // Every candidate must under all circumstances match the language.
    if (cand.language !== lang.language) continue

    // If given, the extended subtag must also be given.
    if (lang.extendedLanguageSubtags.length > 0) {
      if (lang.extendedLanguageSubtags !== cand.extendedLanguageSubtags) {
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
    if (lang.script !== '' && lang.script !== cand.script) continue

    // Now let's find out if this candidate is only close, or even "best"!
    let candidateType = 'close'

    // Every language that has made it until here comes into consideration for a
    // close match.
    if (cand.region === lang.region &&
    cand.variants.length === lang.variants.length &&
    cand.extensions.length === lang.extensions.length) {
      candidateType = 'best'
    }

    // Now determine where we should write this baby.
    if (candidateType === 'best') {
      bestMatch = candidate
      break
    } else if (candidateType === 'close' && !closeMatch) {
      closeMatch = candidate
      // Don't break here, because maybe the best match comes afterwards in the list
    }
  }

  if (bestMatch) bestMatch.status = EXACT
  if (closeMatch) closeMatch.status = CLOSE

  return {
    'exact': bestMatch,
    'close': closeMatch
  }
}

/**
 * Asynchronous function to retrieve the metadata from all available languages
 * @param  {Array}  [paths=[ __dirname,    path.join(app.getPath('userData'] Paths to be searched for
 * @return {Array}          An array containing the language metadata (keys = bcp-47 tags)
 */
function getTranslationMetadata (paths = [ path.join(app.getPath('userData'), '/lang'), path.join(__dirname, '/lang') ]) {
  let metadata = []

  // First get all translations available
  let files = enumLangFiles(paths).map(elem => elem.path)
  // Now loop through them and extract the metadata section
  for (let f of files) {
    let lang = path.basename(f, path.extname(f)) // bcp-47 tag
    if (metadata.find(elem => elem.bcp47 === lang)) continue // Already included
    let data = fs.readFileSync(f, 'utf-8')
    let stat = fs.lstatSync(f)
    data = JSON.parse(data)
    if (!data.hasOwnProperty('metadata')) {
      // Only the language tag and last file modification date
      metadata.push({
        'bcp47': lang,
        'updated_at': stat.mtime.toISOString()
      })
    } else {
      data.metadata['bcp47'] = lang // Add language tag
      // Make sure we have a last updated property.
      if (!data.metadata.hasOwnProperty('updated_at')) {
        data.metadata.updated_at = stat.mtime.toISOString()
      }
      metadata.push(data.metadata)
    }
  }

  return metadata
}

/**
 * Enumerates all language files available to load, based on the given search paths.
 * @param  {Array} [paths=[]] An array of paths to search for. Optional.
 * @return {Array}       An array containing metadata for all found files.
 */
function enumLangFiles (paths = [ path.join(app.getPath('userData'), '/lang'), __dirname ]) {
  // Now go through all search paths and enumerate all available files of interest
  let candidates = []
  for (let p of paths) {
    let list = fs.readdirSync(p)
    for (let file of list) {
      // Sanity checks
      if (!isFile(path.join(p, file))) continue
      if (path.extname(file) !== '.json') continue

      let schema = bcp47.parse(file.substr(0, file.lastIndexOf('.')))
      if (schema.language) {
        candidates.push({
          'tag': bcp47.stringify(schema),
          'path': path.join(p, file)
        })
      }
    }
  }
  return candidates
}

/**
 * Enumerates all available dictionaries within the specified search paths.
 * @param  {Array} [paths=[]] An array of paths to be searched. Defaults to standard paths.
 * @return {Array}       An array containing metadata for all found dictionaries.
 */
function enumDictFiles (paths = [ path.join(app.getPath('userData'), '/dict'), path.join(__dirname, 'dict') ]) {
  let candidates = []
  for (let p of paths) {
    let list = fs.readdirSync(p)
    for (let dir of list) {
      if (!isDir(path.join(p, dir))) continue
      let schema = bcp47.parse(dir)
      if (schema.language) {
        // Additional check to make sure the dictionaries are complete.
        let aff = path.join(p, dir, dir + '.aff')
        let dic = path.join(p, dir, dir + '.dic')
        if (!isFile(aff) || !isFile(dic)) {
          // Second try: index-based names
          aff = path.join(p, dir, 'index.aff')
          dic = path.join(p, dir, 'index.dic')
          if (!isFile(aff) || !isFile(dic)) continue
        }
        // Only add the found dictionary if it is not already present. Useful
        // to override the shipped dictionaries.
        if (!candidates.find(elem => elem.tag === dir)) {
          candidates.push({ 'tag': dir, 'aff': aff, 'dic': dic })
        }
      }
    }
  }
  return candidates
}

module.exports = {
  loadI18nMain,
  trans,
  getDictionaryFile,
  getLanguageFile,
  enumLangFiles,
  enumDictFiles,
  getTranslationMetadata,
  findLangCandidates
}
