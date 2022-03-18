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
import 'codemirror/addon/mode/overlay'
import 'codemirror/addon/mode/multiplex'
import 'codemirror/mode/markdown/markdown'
import 'codemirror/mode/gfm/gfm'
import 'codemirror/mode/stex/stex'
import './modes/markdown-zkn'
import './modes/readability'
import './modes/multiplex'
import './modes/spellchecker'

// 2. Editing addons
import 'codemirror/addon/edit/closebrackets'
import './plugins/continuelist'
import './plugins/indentlist'

// 3. Keymaps
import 'codemirror/keymap/sublime' // This will load the extra commands from SublimeText
import 'codemirror/keymap/vim' // This will load the extra commands from Vim
import 'codemirror/keymap/emacs' // This will load the extra commands from Emacs

// 4. Display addons
// require('codemirror/addon/display/fullscreen')
import 'codemirror/addon/display/placeholder'

// 5. Search addons
import 'codemirror/addon/scroll/annotatescrollbar'
import 'codemirror/addon/search/searchcursor'
import 'codemirror/addon/search/matchesonscrollbar'

// 6. Additional code highlighting-only modes
import 'codemirror/mode/clike/clike'
import 'codemirror/mode/clojure/clojure'
import 'codemirror/mode/css/css'
import 'codemirror/mode/dart/dart'
import 'codemirror/mode/elm/elm'
import 'codemirror/mode/haskell/haskell'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/mllike/mllike'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/php/php'
import 'codemirror/mode/python/python'
import 'codemirror/mode/fortran/fortran'
import 'codemirror/mode/r/r'
import 'codemirror/mode/ruby/ruby'
import 'codemirror/mode/sql/sql'
import 'codemirror/mode/swift/swift'
import 'codemirror/mode/shell/shell'
import 'codemirror/mode/vb/vb'
import 'codemirror/mode/yaml/yaml'
import 'codemirror/mode/go/go'
import 'codemirror/mode/rust/rust'
import 'codemirror/mode/perl/perl'
import 'codemirror/mode/julia/julia'
import 'codemirror/mode/turtle/turtle'
import 'codemirror/mode/sparql/sparql'
import 'codemirror/mode/verilog/verilog'
import 'codemirror/mode/vhdl/vhdl'
import 'codemirror/mode/tcl/tcl'
import 'codemirror/mode/scheme/scheme'
import 'codemirror/mode/commonlisp/commonlisp'
import 'codemirror/mode/powershell/powershell'
import 'codemirror/mode/smalltalk/smalltalk'
import 'codemirror/mode/toml/toml'
import 'codemirror/mode/dockerfile/dockerfile'
import 'codemirror/mode/diff/diff'
import 'codemirror/mode/octave/octave'

// 7. The folding addon
import 'codemirror/addon/fold/foldcode'
import 'codemirror/addon/fold/foldgutter'
import 'codemirror/addon/fold/brace-fold'
import 'codemirror/addon/fold/indent-fold'
import 'codemirror/addon/fold/markdown-fold'
import 'codemirror/addon/fold/comment-fold'
import './plugins/foldcode-helper'

// 8. Hinting (tag autocompletion, e.g.)
import 'codemirror/addon/hint/show-hint'

// 9. Zettlr specific addons
import './plugins/markdown-shortcuts'
import './plugins/autocorrect'
import './plugins/footnotes'
import './plugins/clickable-yaml-tags'
import './plugins/smart-go-line'
import './plugins/render-images'
import './plugins/render-links'
import './plugins/render-citations'
import './plugins/render-tables'
import './plugins/render-tasks'
import './plugins/render-h-tags'
import './plugins/render-emphasis'
import './plugins/render-iframes'
import './plugins/render-math'
import './plugins/render-mermaid'
import './plugins/select-word'
