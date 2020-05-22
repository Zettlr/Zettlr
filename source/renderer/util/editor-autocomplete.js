/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        autocomplete function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Provides the functionality for the showHint plugin
 *
 * END HEADER
 */

const path = require('path')
const objectToArray = require('../../common/util/object-to-array')

module.exports = class EditorAutocomplete {
  constructor () {
    this._autoCompleteStart = null
    this._databases = {
      'tags': [],
      'citekeys': [],
      'files': []
    }
    this._currentDatabase = null // Points to the correct database
  }

  // We need the actual CodeMirror instance to set everything up
  init (cmInstance) {
    /**
     * Sets up an event listener to look whether or not we should display an
     * autocompletion window or not.
     */
    cmInstance.on('change', (cm, changeObj) => {
      let autocompleteDatabase = this._shouldBeginAutocomplete(cm, changeObj)

      if (autocompleteDatabase !== undefined) {
        this._autoCompleteStart = JSON.parse(JSON.stringify(cm.getCursor()))
        this._currentDatabase = this._databases[autocompleteDatabase]
        cm.showHint()
      }
    })
  }

  hint (cm, opt) {
    let term = cm.getRange(this._autoCompleteStart, cm.getCursor()).toLowerCase()
    let completionObject = {
      'list': Object.keys(this._currentDatabase).filter((key) => {
        // First search the ID. Second, search the displayText, if available.
        // Third: return false if nothing else has matched.
        if (this._currentDatabase[key].text.toLowerCase().indexOf(term) === 0) return true
        if (this._currentDatabase[key].hasOwnProperty('displayText') && this._currentDatabase[key].displayText.toLowerCase().indexOf(term) >= 0) return true
        return false
      })
        .sort((a, b) => {
          // This sorter makes sure "special" things are always sorted top
          let aClass = this._currentDatabase[a].className !== undefined
          let bClass = this._currentDatabase[b].className !== undefined
          let aMatch = this._currentDatabase[a].matches || 0
          let bMatch = this._currentDatabase[b].matches || 0
          if (aClass && !bClass) return -1
          if (!aClass && bClass) return 1
          if (aClass && bClass) return aMatch - bMatch
          return 0
        })
        .map(key => this._currentDatabase[key]),
      'from': this._autoCompleteStart,
      'to': cm.getCursor()
    }

    // Set the autocomplete to false as soon as the user has actively selected something.
    cm.on(completionObject, 'pick', (completion) => {
      // In case the user wants to link a file, intercept during
      // the process and add the file link according to the user's
      // preference settings.
      if (this._currentDatabase !== this._tagDB &&
        this._currentDatabase !== this._citeprocIDs &&
        completion.displayText) {
        // Get the correct setting
        let linkPref = global.config.get('zkn.linkWithFilename')
        // Prepare the text to insert, removing the ID if found in the filename
        let text = completion.displayText
        if (completion.id && text.indexOf(completion.id) >= 0) {
          text = text.replace(completion.id, '').trim()
        }
        // In case the whole filename consists of the ID, well.
        // Then, have your ID duplicated.
        if (text.length === 0) text = completion.displayText
        let cur = JSON.parse(JSON.stringify(cm.getCursor()))
        // Check if the linkEnd has been already inserted
        let line = cm.getLine(cur.line)
        let end = this._cm.getOption('zkn').linkEnd || ''
        let prefix = ' '
        let linkEndMissing = false
        if (end !== '' && line.substr(cur.ch, end.length) !== end) {
          // Add the linkend
          prefix = end + prefix
          linkEndMissing = true
        } else {
          // Advance the cursor so that it is outside of the link again
          cur.ch += end.length
          cm.setCursor(cur)
        }
        if (linkPref === 'always' || (linkPref === 'withID' && completion.id)) {
          // We need to add the text after the link.
          cm.replaceSelection(prefix + text)
        } else if (linkEndMissing) {
          cm.replaceSelection(end) // Add the link ending
        }
      }
      this._autoCompleteStart = null
      this._currentDatabase = null // Reset the database used for the hints.
    })

    return completionObject
  }

  _shouldBeginAutocomplete (cm, changeObj) {
    // The easiest are citekeys
    if (changeObj.text[0] === '@') return 'citekeys'

    // Now we need some more stuff
    let cursor = cm.getCursor()
    let line = cm.getLine(cursor.line)

    // Can we begin tag autocompletion?
    if (changeObj.text[0] === '#' &&
      (cursor.ch === 1 || line.charAt(cursor.ch - 2) === ' ')) return 'tags'

    // Can we begin file autocompletion?
    let linkStart = cm.getOption('zkn').linkStart
    let linkStartRange = cm.getRange({
      'line': cursor.line,
      'ch': cursor.ch - linkStart.length
    }, {
      'line': cursor.line,
      'ch': cursor.ch
    })

    if (linkStartRange === linkStart) return 'files'

    return undefined // Nothing to do for us here
  }

  setTagCompletion (tagArray) {
    this._databases['tags'] = tagArray
  }

  setCiteKeyCompletion (citeKeyArray) {
    if (typeof citeKeyArray !== 'object' || citeKeyArray === null) {
      console.warn('No citekeys to update!')
      // Create an empty object.
      this._databases['citekeys'] = Object.create(null)
    } else {
      // Overwrite existing array
      this._databases['citekeys'] = citeKeyArray
    }
  }

  setFileCompletion (dir, fileMatches) {
    if (!dir) {
      this._databases['files'] = []
      return
    }

    let fileDatabase = {}

    // Navigate to the root to include as many files as possible
    while (dir.parent) dir = dir.parent
    let tree = objectToArray(dir, 'children').filter(elem => elem.type === 'file')

    for (let file of tree) {
      let fname = path.basename(file.name, path.extname(file.name))
      let displayText = fname // Always display the filename
      if (file.frontmatter && file.frontmatter.title) displayText += ' ' + file.frontmatter.title
      fileDatabase[fname] = {
        'text': file.id || fname, // Use the ID, if given, or the filename
        'displayText': displayText,
        'id': file.id || false
      }
    }

    // Modify all files that are potential matches
    for (let candidate of fileMatches) {
      let entry = fileDatabase[candidate.fileDescriptor.name]
      if (entry) {
        // Modify
        entry.className = 'cm-hint-colour'
        entry.matches = candidate.matches
      } else {
        let file = candidate.fileDescriptor
        let fname = path.basename(file.name, path.extname(file.name))
        let displayText = fname // Always display the filename
        if (file.frontmatter && file.frontmatter.title) displayText += ' ' + file.frontmatter.title
        fileDatabase[candidate.fileDescriptor.name] = {
          'text': file.id || fname, // Use the ID, if given, or the filename
          'displayText': displayText,
          'id': file.id || false,
          'className': 'cm-hint-colour',
          'matches': candidate.matches
        }
      }
    }

    // Finally set the database
    this._databases['files'] = fileDatabase
  }
}
