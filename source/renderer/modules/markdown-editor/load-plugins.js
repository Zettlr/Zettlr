/*
 * This file is only used to keep the main ZettlrEditor class a little bit
 * cleaner. It requires all plugins necessary for CodeMirror to run, but
 * this layers this task out. After all, we've won about 70 lines of less code
 * in the main class.
 */

// 1. CodeMirror modes
require('codemirror/addon/mode/overlay')
require('codemirror/addon/mode/multiplex')
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/gfm/gfm')
require('codemirror/mode/stex/stex')
require('./modes/markdown-zkn.js')
require('./modes/readability.js')
require('./modes/multiplex.js')
require('./modes/spellchecker.js')

// 2. Editing addons
require('codemirror/addon/edit/closebrackets')
require('./plugins/continuelist.js')
require('./plugins/indentlist.js')

// 3. Keymaps
require('codemirror/keymap/sublime') // This will load the extra commands from SublimeText
require('codemirror/keymap/vim') // This will load the extra commands from Vim
require('codemirror/keymap/emacs') // This will load the extra commands from Emacs

// 4. Display addons
require('codemirror/addon/display/fullscreen')
require('codemirror/addon/display/placeholder')

// 5. Search addons
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/scroll/annotatescrollbar')

// 6. Code highlighting-only modes
require('codemirror/mode/clike/clike.js')
require('codemirror/mode/clojure/clojure.js')
require('codemirror/mode/css/css.js')
require('codemirror/mode/dart/dart.js')
require('codemirror/mode/elm/elm.js')
require('codemirror/mode/gfm/gfm.js')
require('codemirror/mode/haskell/haskell.js')
require('codemirror/mode/javascript/javascript.js')
require('codemirror/mode/mllike/mllike.js')
require('codemirror/mode/xml/xml.js')
require('codemirror/mode/stex/stex.js')
require('codemirror/mode/php/php.js')
require('codemirror/mode/python/python.js')
require('codemirror/mode/r/r.js')
require('codemirror/mode/ruby/ruby.js')
require('codemirror/mode/sql/sql.js')
require('codemirror/mode/swift/swift.js')
require('codemirror/mode/shell/shell.js')
require('codemirror/mode/vb/vb.js')
require('codemirror/mode/yaml/yaml.js')
require('codemirror/mode/go/go.js')
require('codemirror/mode/rust/rust.js')
require('codemirror/mode/julia/julia.js')
require('codemirror/mode/turtle/turtle.js')
require('codemirror/mode/sparql/sparql.js')
require('codemirror/mode/verilog/verilog.js')
require('codemirror/mode/vhdl/vhdl.js')
require('codemirror/mode/tcl/tcl.js')
require('codemirror/mode/scheme/scheme.js')
require('codemirror/mode/commonlisp/commonlisp.js')
require('codemirror/mode/powershell/powershell.js')
require('codemirror/mode/smalltalk/smalltalk.js')

// 7. The folding addon
require('codemirror/addon/fold/foldcode')
require('codemirror/addon/fold/foldgutter')
require('codemirror/addon/fold/brace-fold')
require('codemirror/addon/fold/indent-fold')
require('codemirror/addon/fold/markdown-fold')
require('codemirror/addon/fold/comment-fold')
require('./plugins/foldcode-helper')

// 8. Hinting (tag autocompletion, e.g.)
require('codemirror/addon/hint/show-hint')

// 9. Zettlr specific addons
require('./plugins/markdown-shortcuts.js')
require('./plugins/autocorrect')
require('./plugins/footnotes.js')
require('./plugins/render-images.js')
require('./plugins/render-links.js')
require('./plugins/render-citations.js')
require('./plugins/render-tables.js')
require('./plugins/render-tasks.js')
require('./plugins/render-h-tags.js')
require('./plugins/render-iframes.js')
require('./plugins/render-math.js')
require('./plugins/render-mermaid')
require('./plugins/select-word.js')
require('./plugins/wysiwyg.js')
