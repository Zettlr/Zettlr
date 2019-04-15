/*
 * This file is only used to keep the main ZettlrEditor class a little bit
 * cleaner. It requires all plugins necessary for CodeMirror to run, but
 * this layers this task out. After all, we've won about 70 lines of less code
 * in the main class.
 */

// 1. Mode addons
require('codemirror/addon/mode/overlay')
require('codemirror/addon/mode/multiplex') // Multiplex needed for syntax highlighting

// 2. Editing addons
// require('codemirror/addon/edit/continuelist')
require('codemirror/addon/edit/closebrackets')
require('./continuelist.js')
require('./indentlist.js')

// 3. Display addons
require('codemirror/addon/display/fullscreen')

// 4. Search addons
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/scroll/annotatescrollbar')

// 5. Central modes
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/gfm/gfm')
require('codemirror/mode/stex/stex')

// 6. Code highlighting modes
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/clike/clike')
require('codemirror/mode/css/css')
require('codemirror/mode/php/php')
require('codemirror/mode/python/python')
require('codemirror/mode/r/r')
require('codemirror/mode/ruby/ruby')
require('codemirror/mode/sql/sql')
require('codemirror/mode/swift/swift')
require('codemirror/mode/shell/shell')
require('codemirror/mode/yaml/yaml')
require('codemirror/mode/go/go')

// 7. The folding addon
require('codemirror/addon/fold/foldcode')
require('codemirror/addon/fold/foldgutter')
require('codemirror/addon/fold/brace-fold')
require('codemirror/addon/fold/indent-fold')
require('codemirror/addon/fold/markdown-fold')
require('codemirror/addon/fold/comment-fold')

// 8. Hinting (tag autocompletion, e.g.)
require('codemirror/addon/hint/show-hint')

// Zettlr specific addons
require('./zettlr-plugin-markdown-shortcuts.js')
require('./zettlr-modes-spellchecker-zkn.js')
require('./zettlr-plugin-footnotes.js')
require('./zettlr-plugin-render-images.js')
require('./zettlr-plugin-render-links.js')
require('./zettlr-plugin-render-citations.js')
require('./zettlr-plugin-render-tasks.js')
require('./zettlr-plugin-render-h-tags.js')
require('./zettlr-plugin-render-iframes.js')
require('./zettlr-plugin-render-math.js')
require('./zettlr-plugin-markdown-header-classes.js')
