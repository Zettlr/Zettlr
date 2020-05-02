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
const search = require('./search-file')
const countWords = require('../../../common/util/count-words')
const extractYamlFrontmatter = require('../../../common/util/extract-yaml-frontmatter')
const { shell } = require('electron')

// Here are all supported variables for Pandoc:
// https://pandoc.org/MANUAL.html#variables
// Below is a selection that Zettlr may use
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

function metadata (fileObject) {
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
}

async function parseFile (filePath, cache, parent = null) {
  // First of all, prepare the file descriptor
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
    'frontmatter': undefined, // May contain frontmatter variables
    // This variable is only used to transfer the file contents to and from
    // the renderer. It will be empty all other times, because otherwise the
    // RAM will fill up pretty fast.
    'content': ''
  }

  // In any case, we need the most recent times.
  try {
    // Get lstat
    let stat = await fs.lstat(filePath)
    file.modtime = stat.ctimeMs
    file.creationtime = stat.birthtimeMs
  } catch (e) {
    global.log.error('Error reading file ' + filePath, e)
    throw e // Rethrow
  }

  // Before reading in the full file and parsing it,
  // let's check if the file has been changed
  if (cache.has(file.hash)) {
    let cachedFile = cache.get(file.hash)
    // If the modtime is still the same, we can apply the cache
    if (cachedFile.modtime === file.modtime) applyCache(file, cachedFile)
  } else {
    // Read in the file, parse the contents and make sure to cache the file
    let content = await fs.readFile(filePath, { encoding: 'utf8' })
    parseFileContents(file, content)
    cacheFile(file, cache)
  }

  // Get the target, if applicable
  file.target = global.targets.get(file.hash)

  // Finally, report the tags
  global.tags.report(file.tags)

  return file
}

function parseFileContents (file, content) {
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
  file.charCount = countWords(content, true)

  // Extract a potential YAML frontmatter
  file.frontmatter = undefined // Reset first
  let frontmatter = extractYamlFrontmatter(content)
  if (frontmatter) {
    if (!file.frontmatter) file.frontmatter = {}
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
  file.linefeed = '\n'
  if (/\r\n/.test(content)) file.linefeed = '\r\n'
  if (/\n\r/.test(content)) file.linefeed = '\n\r'

  // Makes footnotes unique by prefixing them with this file's hash (which is unique)
  // Pandoc will make sure the footnotes are numbered correctly.
  // TODO
  // if (options.hasOwnProperty('uniqueFootnotes') && options.uniqueFootnotes === true) {
  //   cnt = cnt.replace(/\[\^([\w]+?)\]/gm, (match, p1, offset, string) => `[^${String(this.hash)}${p1}]`)
  // }

  // Now read all tags
  file.tags = [] // Reset tags
  while ((match = tagRE.exec(mdWithoutCode)) != null) {
    let tag = match[1]
    tag = tag.replace(/#/g, '') // Prevent headings levels 2-6 from showing up in the tag list
    if (tag.length > 0) file.tags.push(match[1].toLowerCase())
  }

  // Merge possible keywords from the frontmatter
  if (file.frontmatter && file.frontmatter.hasOwnProperty('keywords')) {
    file.tags = file.tags.concat(file.frontmatter.keywords)
  }

  // Remove duplicates
  file.tags = [...new Set(file.tags)]

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
    file.id = match[1]
  } else {
    file.id = '' // Remove the file id again
  }
}

async function searchFile (fileObject, terms) {
  // Initialise the content variables (needed to check for NOT operators)
  let cnt = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  return search(fileObject, terms, cnt)
}

module.exports = {
  'metadata': function (fileObject) {
    return metadata(fileObject)
  },
  'load': async function (fileObject) {
    // Loads the content of a file from disk
    return fs.readFile(fileObject.path, { encoding: 'utf8' })
  },
  'save': async function (fileObject, content) {
    await fs.writeFile(fileObject.path, content)
    // Make sure to keep the file object itself as well as the tags updated
    global.tags.remove(fileObject.tags)
    parseFileContents(fileObject, content)
    global.tags.report(fileObject.tags)
  },
  'rename': async function (fileObject, options) {
    let oldPath = fileObject.path
    let newPath = path.join(path.dirname(fileObject.path), options.name)
    await fs.rename(oldPath, newPath)
    // Now update the object
    fileObject.path = newPath
    fileObject.hash = hash(newPath)
    fileObject.name = options.name
  },
  'remove': async function (fileObject) {
    // await fs.unlink(fileObject.path)
    if (shell.moveItemToTrash(fileObject.path) && fileObject.parent) {
      // Splice it from the parent directory
      fileObject.parent.children.splice(fileObject.parent.children.indexOf(fileObject), 1)
    }
  },
  'parse': async function (filePath, cache, parent = null) {
    return parseFile(filePath, cache, parent)
  },
  'updateFile': function (fileObject, newContents) {
    // Updates a file object with new contents
    return parseFileContents(fileObject, newContents)
  },
  'setTarget': function (fileObject, target) {
    fileObject.target = target
  },
  'search': async function (fileObject, terms) {
    return searchFile(fileObject, terms)
  }
}
