/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrQuicklook class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single Quicklook window
 *
 * END HEADER
 */

const EditorSearch = require('../renderer/util/editor-search')

// CodeMirror related includes
// The autoloader requires all necessary CodeMirror addons and modes that are
// used by the main class. It simply folds about 70 lines of code into an extra
// file.
require('../renderer/assets/codemirror/autoload')

// Finally CodeMirror itself
const CodeMirror = require('codemirror')

/**
 * Quicklooks are read-only CodeMirror instances for single files.
 */
class ZettlrQuicklook {
  /**
    * Create a window
    * @param {ZettlrBody} parent   Calling object
    * @param {ZettlrFile} file     The file whose content should be displayed
    */
  constructor (parent, file) {
    this._parent = parent
    this._file = file
    this._cm = null
    this._search = document.getElementById('searchWhat')
    this._findTimeout = null // Timeout to begin search after

    this._cm = CodeMirror.fromTextArea(document.querySelector('textarea'), {
      readOnly: true,
      mode: 'multiplex',
      lineWrapping: true,
      extraKeys: {
        [(process.platform === 'darwin') ? 'Cmd-F' : 'Ctrl-F']: (cm) => { this._search.focus() }
      },
      zkn: {
        idRE: '(\\d{14})', // What do the IDs look like?
        linkStart: '[[', // Start of links?
        linkEnd: ']]' // End of links?
      },
      theme: 'zettlr', // We don't actually use the cm-s-zettlr class, but this way we prevent the default theme from overriding.
      cursorBlinkRate: -1 // Hide the cursor
    })

    this._searcher = new EditorSearch(this._cm)

    this._search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        // Search next immediately because the term is the same and the user
        // wants to cycle through the results.
        if (this._findTimeout) clearTimeout(this._findTimeout)
        this._searcher.searchNext(this._search.value)
      } else {
        if (e.key === 'Escape') this._search.value = ''
        // Set a timeout with a short delay to not make the app feel laggy
        clearTimeout(this._findTimeout)
        this._findTimeout = setTimeout(() => {
          if (this._search.value === '') this._searcher.stopSearch()
          this._searcher.searchNext(this._search.value)
        }, 300) // 300ms delay
      }
    })

    this._cm.setValue(this._file.content)
    // Apply heading line classes immediately
    this._cm.execCommand('markdownHeaderClasses')
    this._cm.refresh()
  }

  onConfigUpdate (config) {
    this._cm.setOption('zkn', config.zkn)
    // Quote Marijn: "Resetting the mode option with setOption will trigger a full re-parse."
    // Source: https://github.com/codemirror/CodeMirror/issues/3318#issuecomment-111067281
    this._cm.setOption('mode', this._cm.getOption('mode'))
  }

  setContent (file) {
    this._file = file
    this._cm.setValue(this._file.content)
    // Apply heading line classes immediately
    this._cm.execCommand('markdownHeaderClasses')
    this._cm.refresh()
  }
}

module.exports = ZettlrQuicklook
