/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseFile function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Parses a file, retrieving it from cache, if possible.
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')
const hash = require('../../../common/util/hash')
const countWords = require('../../../common/util/count-words')
const extractYamlFrontmatter = require('../../../common/util/extract-yaml-frontmatter')

// This is a list of all possible Pandoc Frontmatter
// variables that Zettlr may make use of
const FRONTMATTER_VARS = [
  'title',
  'subtitle',
  'author',
  'date',
  'keywords',
  'lang'
]

/**
 * Applies a cached file, saving time where the file is not being parsed.
 * @param {Object} origFile The file object
 * @param {Object} cachedFile The cache object to apply
 */
function applyCache (origFile, cachedFile) {
  for (let prop of Object.keys(origFile)) {
    if (cachedFile.hasOwnProperty(prop)) {
      origFile[prop] = cachedFile[prop]
    }
  }
}

/**
 * Caches a file, but removes circular structures beforehand.
 * @param {Object} origFile The file to cache
 */
function cacheFile (origFile, cacheAdapter) {
  let cache = {}
  for (let prop of Object.keys(origFile)) {
    // Save everything to the cache object except the parent to
    // prevent circular structures throwing errors on persisting.
    if (prop === 'parent') continue
    cache[prop] = origFile[prop]
  }

  cacheAdapter.set(cache.hash, cache)
}

module.exports = {
  'metadata': function (fileObject) {
    return {
      // By only passing the hash, the object becomes
      // both lean AND it can be reconstructed into a
      // circular structure with NO overheads in the
      // renderer.
      'parent': (fileObject.parent) ? fileObject.parent.hash : null,
      'dir': fileObject.dir,
      'path': fileObject.path,
      'name': fileObject.name,
      'hash': fileObject.hash,
      'ext': fileObject.ext,
      'id': fileObject.id,
      'tags': fileObject.tags,
      'type': fileObject.type,
      'wordCount': fileObject.wordCount,
      'charCount': fileObject.charCount,
      'target': fileObject.target,
      'modtime': fileObject.modtime,
      'creationtime': fileObject.creationtime,
      'frontmatter': fileObject.frontmatter,
      'linefeed': fileObject.linefeed
    }
  },
  'load': async function (fileObject) {
    // Loads the content of a file from disk
    return fs.readFile(fileObject.path, { encoding: 'utf8' })
  }
}

module.exports.parse = async function (filePath, cache, parent = null) {
  let file = {
    'parent': parent,
    'dir': path.dirname(filePath), // Containing dir
    'path': filePath,
    'name': path.basename(filePath),
    'hash': hash(filePath),
    'ext': path.extname(filePath),
    'id': '', // The ID, if there is one inside the file.
    'tags': [], // All tags that are to be found inside the file's contents.
    'type': 'file',
    'wordCount': 0,
    'charCount': 0,
    'target': null, // Contains the target object
    'modtime': 0, // Modification time
    'creationtime': 0, // Creation time
    'linefeed': '\n',
    'frontmatter': {}, // May contain frontmatter variables
    // This variable is only used to transfer the file contents to and from
    // the renderer. It will be empty all other times, because otherwise the
    // RAM will fill up pretty fast.
    'content': ''
  }

  try {
    // Get lstat
    let stat = await fs.lstat(filePath)
    file.modtime = stat.mtime.getTime()
    file.creationtime = stat.birthtime.getTime()
  } catch (e) {
    global.log.error('Error reading file ' + filePath, e)
    throw e // Rethrow
  }

  // Before reading in the full file and parsing it,
  // let's check if the file has been changed
  if (cache.has(file.hash)) {
    let cachedFile = cache.get(file.hash)
    if (cachedFile.modtime === file.modtime) {
      // Cool, apply cache and return immediately!
      applyCache(file, cachedFile)
      return file
    }
  } // Else: Parse and add later

  let content = await fs.readFile(filePath, { encoding: 'utf8' })

  // Now parse that thing
  let idStr = global.config.get('zkn.idRE')
  // Make sure the ID definitely has at least one
  // capturing group to not produce errors.
  if (!(/\(.+?\)/.test(idStr))) idStr = `(${idStr})`

  let idRE = new RegExp(idStr, 'g')
  let linkStart = global.config.get('zkn.linkStart')
  let linkEnd = global.config.get('zkn.linkEnd')
  // To detect tags in accordance with what the engine will render as tags,
  // we need to exclude everything that is not preceded by either a newline
  // or a space.
  // Positive lookbehind: Assert either a space, a newline or the start of the
  // string.
  let tagRE = /(?<= |\n|^)#(#?[^\s,.:;…!?"'`»«“”‘’—–@$%&*^+~÷\\/|<=>[\](){}]+#?)/g
  let match
  // Get the word and character count
  file.wordCount = countWords(content)
  file.charCount = content.length

  // Extract a potential YAML frontmatter
  let frontmatter = extractYamlFrontmatter(content)
  if (frontmatter) {
    // Here are all supported variables for Pandoc:
    // https://pandoc.org/MANUAL.html#variables
    for (let [ key, value ] of Object.entries(frontmatter)) {
      if (FRONTMATTER_VARS.includes(key)) {
        file.frontmatter[key] = value
      }
    }
  }

  // Create a copy of the code without any code blocks and inline
  // code for the tag and ID extraction methods.
  let mdWithoutCode = content.replace(/`{1,3}[^`]+`{1,3}/g, '')

  // Determine linefeed to preserve on saving so that version control
  // systems don't complain.
  if (/\r\n/.test(content)) {
    file.linefeed = '\r\n'
  } else if (/\n\r/.test(content)) {
    file.linefeed = '\n\r'
  }

  // Makes footnotes unique by prefixing them with this file's hash (which is unique)
  // Pandoc will make sure the footnotes are numbered correctly.
  // TODO
  // if (options.hasOwnProperty('uniqueFootnotes') && options.uniqueFootnotes === true) {
  //   cnt = cnt.replace(/\[\^([\w]+?)\]/gm, (match, p1, offset, string) => `[^${String(this.hash)}${p1}]`)
  // }

  // Now read all tags
  while ((match = tagRE.exec(mdWithoutCode)) != null) {
    let tag = match[1]
    tag = tag.replace(/#/g, '') // Prevent headings levels 2-6 from showing up in the tag list
    if (tag.length > 0) file.tags.push(match[1].toLowerCase())
  }

  // Merge possible keywords from the frontmatter
  if (file.frontmatter.hasOwnProperty('keywords')) {
    file.tags = file.tags.concat(file.frontmatter.keywords)
  }

  // Remove duplicates
  file.tags = [...new Set(file.tags)]

  // Report the tags to the global database
  if (file.tags.length > 0) global.tags.report(file.tags)

  // Assume an ID in the file name (takes precedence over IDs in the file's
  // content)
  if ((match = idRE.exec(file.name)) == null) {
    while ((match = idRE.exec(mdWithoutCode)) != null) {
      if (mdWithoutCode.substr(match.index - linkStart.length, linkStart.length) !== linkStart) {
        // Found the first ID. Precedence should go to the first found.
        // Minor BUG: Takes IDs that are inside links but not literally make up for a link.
        break
      }
    }
  }

  if ((match != null) && (match[1].substr(-(linkEnd.length)) !== linkEnd)) {
    file.id = match[1] || ''
  }

  // Make sure to cache that thing
  cacheFile(file, cache)

  return file
}
