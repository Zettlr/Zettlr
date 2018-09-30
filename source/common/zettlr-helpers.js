/**
* BEGIN HEADER
*
* Contains:        General helper functions
* CVM-Role:        <none>
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This file contains several functions, not classes, that are
*                  used for general purposes.
*
* END HEADER
*/

// GLOBALS

// Supported filetypes
const filetypes = require('./data.json').filetypes
// Ignored directory patterns
const ignoreDirs = require('./data.json').ignoreDirs

// Translation functions
const { trans } = require('./lang/i18n.js')

// Include modules
const path = require('path')
const fs = require('fs')

/**
* Basic hashing function (thanks to https://stackoverflow.com/a/7616484)
* @param  {String} string The string that should be hashed
* @return {Integer}        The hash of the given string
*/
function hash (string) {
  let hash = 0
  let i, chr

  if (string.length === 0) return hash

  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

/**
 * This function flattens an object tree (file tree) to an array.
 * @param  {Object} tree        A ZettlrDir tree
 * @param  {Array}  [newarr=[]] Needed for recursion. Do not use.
 * @return {Mixed}             An array or nothing.
 */
function flattenDirectoryTree (tree, newarr = []) {
  // In case of completely empty stuff, simply return an empty array
  if (tree == null || tree.length === 0) {
    return []
  }

  if (tree.type === 'file') {
    return newarr.push(tree)
  } else if (tree.type === 'directory' || tree.type === 'virtual-directory') {
    // Append directory (for easier overview)
    newarr.push(tree)
    if (tree.children != null) {
      for (let c of tree.children) {
        newarr.concat(flattenDirectoryTree(c, newarr))
      }
    }
    return newarr
  }
}

/**
* This function can sort an array of ZettlrFile and ZettlrDir objects
* @param  {Array} arr An array containing only ZettlrFile, ZettlrVirtualDirectory and ZettlrDir objects
* @param {String} [type='name-up'] The type of sorting - can be time-up, time-down, name-up or name-down
* @return {Array}     The sorted array
*/
function sort (arr, type = 'name-up') {
  // First split the array based on type
  let f = []
  let d = []
  let vd = []

  for (let c of arr) {
    if (c.type === 'file') {
      f.push(c)
    } else if (c.type === 'directory') {
      d.push(c)
    } else if (c.type === 'virtual-directory') {
      vd.push(c)
    }
  }

  // Then sort the directories (always based on name)
  d.sort((a, b) => {
    // Negative return: a is smaller b (case insensitive)
    if (a.name.toLowerCase() < b.name.toLowerCase()) {
      return -1
    } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
      return 1
    } else {
      return 0
    }
  })

  // The virtual directories (also by name)
  vd.sort((a, b) => {
    // Negative return: a is smaller b (case insensitive)
    if (a.name.toLowerCase() < b.name.toLowerCase()) {
      return -1
    } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
      return 1
    } else {
      return 0
    }
  })

  // Now sort the files according to the type
  f.sort((a, b) => {
    if (type === 'name-up') {
      if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return -1
      } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1
      } else {
        return 0
      }
    } else if (type === 'name-down') {
      if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return 1
      } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return -1
      } else {
        return 0
      }
    } else if (type === 'time-up') {
      if (a.modtime < b.modtime) {
        return -1
      } else if (a.modtime > b.modtime) {
        return 1
      } else {
        return 0
      }
    } else if (type === 'time-down') {
      if (a.modtime < b.modtime) {
        return 1
      } else if (a.modtime > b.modtime) {
        return -1
      } else {
        return 0
      }
    }
  })

  // Return sorted array files -> virtual directories -> directories
  return f.concat(vd).concat(d)
}

/**
* This function generates a (per second unique) name
* @return {String} A name in the format "New File YYYY-MM-DD hh:mm:ss.md"
*/
function generateName () {
  let date = new Date()
  let yyyy = date.getFullYear()
  let mm = date.getMonth() + 1
  if (mm <= 9) mm = '0' + mm
  let dd = date.getDate()
  if (dd <= 9) dd = '0' + dd
  let hh = date.getHours()
  if (hh <= 9) hh = '0' + hh
  let m = date.getMinutes()
  if (m <= 9) m = '0' + m
  let ss = date.getSeconds()
  if (ss <= 9) ss = '0' + ss
  let add = yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + m + ':' + ss

  return 'New file ' + add + '.md'
}

/**
* This function generates a (per second unique) ID to be inserted into the editor
* @return {String} An id in the format "YYYYMMDDHHMMSS"
*/
function generateId (pattern = '@ID:%Y%M%D%h%m%s') {
  let date = new Date()
  let yyyy = date.getFullYear()
  let mm = date.getMonth() + 1
  if (mm <= 9) mm = '0' + mm
  let dd = date.getDate()
  if (dd <= 9) dd = '0' + dd
  let hh = date.getHours()
  if (hh <= 9) hh = '0' + hh
  let m = date.getMinutes()
  if (m <= 9) m = '0' + m
  let ss = date.getSeconds()
  if (ss <= 9) ss = '0' + ss

  // Now generate the id by replacing all placeholders in the pattern
  pattern = pattern.replace(/%Y/g, yyyy)
  pattern = pattern.replace(/%M/g, mm)
  pattern = pattern.replace(/%D/g, dd)
  pattern = pattern.replace(/%h/g, hh)
  pattern = pattern.replace(/%m/g, m)
  pattern = pattern.replace(/%s/g, ss)
  return pattern
}

/**
* Format a date. TODO: Localize options once they're implemented in the preferences/config.
* @param  {Date} dateObj Object of type date.
* @return {String}         Returns the localized, human-readable date as a string
*/
function formatDate (dateObj) {
  let yyyy = dateObj.getFullYear()
  let mm = dateObj.getMonth() + 1
  let dd = dateObj.getDate()
  let h = dateObj.getHours()
  let m = dateObj.getMinutes()

  if (mm < 10) {
    mm = '0' + mm
  }
  if (dd < 10) {
    dd = '0' + dd
  }
  if (h < 10) {
    h = '0' + h
  }
  if (m < 10) {
    m = '0' + m
  }

  return `${dd}.${mm}.${yyyy}, ${h}:${m}`
}

/**
* Returns true, if a directory should be ignored, and false, if not.
* @param  {String} p The path to the directory. It will be checked against some regexps.
* @return {Boolean}   True or false, depending on whether or not the dir should be ignored.
*/
function ignoreDir (p) {
  let name = path.basename(p)
  // Directories are ignored on a regexp basis
  for (let re of ignoreDirs) {
    let regexp = new RegExp(re, 'i')
    if (regexp.test(name)) {
      return true
    }
  }

  return false
}

/**
* Returns true, if a given file should be ignored.
* @param  {String} p The path to the file.
* @return {Boolean}   True or false, depending on whether the file should be ignored.
*/
function ignoreFile (p) {
  let ext = path.extname(p)
  return (!filetypes.includes(ext))
}

/**
 * Checks if a given path is a valid file
 * @param  {String}  p The path to check
 * @return {Boolean}   True, if it is a valid path + file, and false if not
 */
function isFile (p) {
  try {
    let s = fs.lstatSync(p)
    return s.isFile()
  } catch (e) {
    return false
  }
}

/**
 * Checks if a given path is a valid directory
 * @param  {String}  p The path to check
 * @return {Boolean}   True, if p is valid and also a directory
 */
function isDir (p) {
  try {
    let s = fs.lstatSync(p)
    return s.isDirectory()
  } catch (e) {
    return false
  }
}

/**
 * This function determines whether or not a given path describes an attachment.
 * @param  {string}  p The path to be checked.
 * @return {Boolean}   Returns true, if the path is an attachment, or false.
 */
function isAttachment (p) {
  if (!global.attachmentExtensions) {
    // Something went wrong on init. Hey ZettlrConfig, are you even there?
    return false
  }

  return isFile(p) && global.attachmentExtensions.includes(path.extname(p))
}

/**
 * This function checks the integrity of a given dictionary. Simply pass it the
 * language code and it will tell you whether or not a dictionary exists at one
 * of these paths.
 * @param  {String}  lang The language code (e.g. it_IT)
 * @return {Boolean}      True, if a valid hunspell dict was found, otherwise false.
 */
function isDictAvailable (lang) {
  let p = path.join(__dirname, '../renderer/assets/dict', lang)
  try {
    fs.lstatSync(p)
  } catch (e) {
    // Directory does not exist at the default path. Check custom path
    p = path.join(require('electron').app.getPath('userData'), 'dict', lang)
    try {
      fs.lstatSync(p)
    } catch (e) {
      return false // Not even there.
    }
  }

  // The directory exists. Now check for the existence of the dic and aff files.
  // p will hold either the path to the internal dicts or the custom.
  if (!isFile(path.join(p, lang + '.dic'))) {
    return false
  }
  if (!isFile(path.join(p, lang + '.aff'))) {
    return false
  }

  return true
}

/**
 * Adds delimiters to numbers.
 * @param  {Number} number The number to be localised.
 * @return {String}        The number with delimiters.
 */
function localiseNumber (number) {
  if (typeof number !== 'number' || number < 1000) {
    return number
  }

  let delim = trans('localise.thousand_delimiter')
  if (delim.length > 1) {
    // No delimiter available -> fallback
    delim = '.'
  }

  let ret = ''
  ret = number.toString()
  let cnt = 0
  for (let i = ret.length - 1; i > 0; i--) {
    cnt++
    if (cnt === 3) {
      ret = ret.substr(0, i) + delim + ret.substr(i)
      cnt = 0
    }
  }

  return ret
}

/**
 * This function takes a Markdown string and replaces all occurrences of images
 * with an absolutised version.
 * @param  {String} basepath The basepath with which relative paths should be joined.
 * @param  {String} mdstring The string to be altered.
 * @return {String}          The altered mdstring value.
 */
function makeImgPathsAbsolute (basePath, mdstring) {
  let imgRE = /^!\[(.*?)\]\((.+?)\)({.*})?$/gmi
  return mdstring.replace(imgRE, (match, p1, p2, p3, offset, string) => {
    // Check if the path (p2) contains the absolute path
    if (p2.indexOf(basePath) === 0 || p2.indexOf('http') === 0) {
      // It's already absolute (either local or remote)
      return `![${p1}](${p2})${(p3 != null) ? p3 : ''}`
    } else {
      // Make it absolute
      return `![${p1}](${path.join(basePath, p2)})${(p3 != null) ? p3 : ''}`
    }
  })
}

module.exports = {
  hash,
  flattenDirectoryTree,
  sort,
  generateName,
  generateId,
  formatDate,
  ignoreFile,
  ignoreDir,
  isFile,
  isDir,
  isAttachment,
  localiseNumber,
  isDictAvailable,
  makeImgPathsAbsolute
}
