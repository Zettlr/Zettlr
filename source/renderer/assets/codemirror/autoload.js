/*
 * This file is only used to keep the main gettlrEditor class a little bit
 * cleaner. It requires all plugins necessary for CodeMirror to run, but
 * this layers this task out. After all, we've won about 70 lines of less code
 * in the main class.
 */

const highlightingModes = require('../../../common/data').highlightingModes

// 1. Mode addons
require('codemirror/addon/mode/overlay')
require('codemirror/addon/mode/multiplex') // Multiplex needed for syntax highlighting

// 2. Editing addons
require('codemirror/addon/edit/closebrackets')
require('./continuelist.js')
require('./indentlist.js')
require('codemirror/keymap/sublime') // This will load the extra commands from SublimeText

// 3. Display addons
require('codemirror/addon/display/fullscreen')
require('codemirror/addon/display/placeholder')

// 4. Search addons
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/scroll/annotatescrollbar')

// 5. Central modes
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/gfm/gfm')
require('codemirror/mode/stex/stex')

// 6. Code highlighting modes
for (let mode of new Set(Object.values(highlightingModes).map(hlmode => hlmode.mode))) {
  require(`codemirror/mode/${mode}/${mode}`)
}

// 7. The folding addon
require('codemirror/addon/fold/foldcode')
require('codemirror/addon/fold/foldgutter')
require('codemirror/addon/fold/brace-fold')
require('codemirror/addon/fold/indent-fold')
require('codemirror/addon/fold/markdown-fold')
require('codemirror/addon/fold/comment-fold')
require('./gettlr-plugin-foldcode-helper')

// 8. Hinting (tag autocompletion, e.g.)
require('codemirror/addon/hint/show-hint')

// gettlr specific addons
require('./gettlr-plugin-markdown-shortcuts.js')
require('./gettlr-mode-spellchecker.js')
require('./gettlr-mode-zkn.js')
require('./gettlr-mode-readability.js')
require('./gettlr-mode-multiplex.js')
require('./gettlr-plugin-autocorrect')
require('./gettlr-plugin-footnotes.js')
require('./gettlr-plugin-render-images.js')
require('./gettlr-plugin-render-links.js')
require('./gettlr-plugin-render-citations.js')
require('./gettlr-plugin-render-tables.js')
require('./gettlr-plugin-render-tasks.js')
require('./gettlr-plugin-render-h-tags.js')
require('./gettlr-plugin-render-iframes.js')
require('./gettlr-plugin-render-math.js')
require('./gettlr-plugin-render-mermaid')
require('./gettlr-plugin-markdown-header-classes.js')
require('./gettlr-plugin-select-word.js')
require('./gettlr-plugin-wysiwyg.js')
