/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Plugin loader
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file requires all necessary CodeMirror plugins, modes
 *                  and addons.
 *
 * END HEADER
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
// require('codemirror/addon/display/fullscreen')
require('codemirror/addon/display/placeholder')

// 5. Search addons
require('codemirror/addon/scroll/annotatescrollbar')
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/search/matchesonscrollbar')

// 6. Code highlighting-only modes
require('codemirror/mode/clike/clike')
require('codemirror/mode/clojure/clojure')
require('codemirror/mode/css/css')
require('codemirror/mode/dart/dart')
require('codemirror/mode/elm/elm')
require('codemirror/mode/gfm/gfm')
require('codemirror/mode/haskell/haskell')
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/mllike/mllike')
require('codemirror/mode/xml/xml')
require('codemirror/mode/stex/stex')
require('codemirror/mode/php/php')
require('codemirror/mode/python/python')
require('codemirror/mode/r/r')
require('codemirror/mode/ruby/ruby')
require('codemirror/mode/sql/sql')
require('codemirror/mode/swift/swift')
require('codemirror/mode/shell/shell')
require('codemirror/mode/vb/vb')
require('codemirror/mode/yaml/yaml')
require('codemirror/mode/go/go')
require('codemirror/mode/rust/rust')
require('codemirror/mode/perl/perl')
require('codemirror/mode/julia/julia')
require('codemirror/mode/turtle/turtle')
require('codemirror/mode/sparql/sparql')
require('codemirror/mode/verilog/verilog')
require('codemirror/mode/vhdl/vhdl')
require('codemirror/mode/tcl/tcl')
require('codemirror/mode/scheme/scheme')
require('codemirror/mode/commonlisp/commonlisp')
require('codemirror/mode/powershell/powershell')
require('codemirror/mode/smalltalk/smalltalk')
require('codemirror/mode/toml/toml')
require('codemirror/mode/dockerfile/dockerfile')
require('codemirror/mode/diff/diff')
require('codemirror/mode/octave/octave')

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
require('./plugins/smart-go-line.js')
require('./plugins/render-images.js')
require('./plugins/render-links.js')
require('./plugins/render-citations.js')
require('./plugins/render-tables.js')
require('./plugins/render-tasks.js')
require('./plugins/render-h-tags.js')
require('./plugins/render-iframes.js')
require('./plugins/render-math.ts')
require('./plugins/render-mermaid')
require('./plugins/select-word.js')
require('./plugins/wysiwyg.js')
