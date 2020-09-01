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
require('codemirror/addon/edit/closebrackets')
require('./continuelist.js')
require('./indentlist.js')
require('codemirror/keymap/sublime') // This will load the extra commands from SublimeText
require('codemirror/keymap/vim') // This will load the extra commands from Vim
require('codemirror/keymap/emacs') // This will load the extra commands from Emacs

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
require('codemirror/mode/clike/clike.js')
require('codemirror/mode/clojure/clojure.js')
require('codemirror/mode/css/css.js')
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
require('./zettlr-plugin-foldcode-helper')

// 8. Hinting (tag autocompletion, e.g.)
require('codemirror/addon/hint/show-hint')

// Zettlr specific addons
require('./zettlr-plugin-markdown-shortcuts.js')
require('./zettlr-mode-spellchecker.js')
require('./zettlr-mode-zkn.js')
require('./zettlr-mode-readability.js')
require('./zettlr-mode-multiplex.js')
require('./zettlr-plugin-autocorrect')
require('./zettlr-plugin-footnotes.js')
require('./zettlr-plugin-render-images.js')
require('./zettlr-plugin-render-links.js')
require('./zettlr-plugin-render-citations.js')
require('./zettlr-plugin-render-tables.js')
require('./zettlr-plugin-render-tasks.js')
require('./zettlr-plugin-render-h-tags.js')
require('./zettlr-plugin-render-iframes.js')
require('./zettlr-plugin-render-math.js')
require('./zettlr-plugin-render-mermaid')
require('./zettlr-plugin-markdown-header-classes.js')
require('./zettlr-plugin-markdown-codeblock-classes.js')
require('./zettlr-plugin-select-word.js')
require('./zettlr-plugin-wysiwyg.js')
