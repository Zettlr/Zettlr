/* global CodeMirror define */
// ZETTLR SPELLCHECKER PLUGIN

const highlightingModes = {
  'text/javascript': {
    'mode': 'javascript',
    'selectors': [ 'javascript', 'js', 'node' ]
  },
  'application/json': {
    'mode': 'javascript',
    'selectors': ['json']
  },
  'text/typescript': {
    'mode': 'javascript',
    'selectors': [ 'typescript', 'ts' ]
  },
  'text/x-csrc': {
    'mode': 'clike',
    'selectors': ['c']
  },
  'text/x-c++src': {
    'mode': 'clike',
    'selectors': [ 'c\\+\\+', 'cpp' ]
  },
  'text/x-csharp': {
    'mode': 'clike',
    'selectors': [ 'c\\#', 'csharp', 'cs' ]
  },
  'text/x-clojure': {
    'mode': 'clojure',
    'selectors': ['clojure']
  },
  'text/x-elm': {
    'mode': 'elm',
    'selectors': ['elm']
  },
  'text/x-fsharp': {
    'mode': 'mllike',
    'selectors': [ 'f\\#', 'fsharp' ]
  },
  'text/x-java': {
    'mode': 'clike',
    'selectors': ['java']
  },
  'text/x-kotlin': {
    'mode': 'clike',
    'selectors': [ 'kotlin', 'kt' ]
  },
  'text/x-haskell': {
    'mode': 'haskell',
    'selectors': [ 'haskell', 'hs' ]
  },
  'text/x-objectivec': {
    'mode': 'clike',
    'selectors': [ 'objective-c', 'objectivec', 'objc' ]
  },
  'text/x-scala': {
    'mode': 'clike',
    'selectors': ['scala']
  },
  'text/css': {
    'mode': 'css',
    'selectors': ['css']
  },
  'text/x-scss': {
    'mode': 'css',
    'selectors': ['scss']
  },
  'text/x-less': {
    'mode': 'css',
    'selectors': ['less']
  },
  'text/html': {
    'mode': 'xml',
    'selectors': ['html']
  },
  'text/x-markdown': {
    'mode': 'gfm',
    'selectors': [ 'markdown', 'md' ]
  },
  'application/xml': {
    'mode': 'xml',
    'selectors': ['xml']
  },
  'text/x-stex': {
    'mode': 'stex',
    'selectors': [ 'latex', 'tex' ]
  },
  'text/x-php': {
    'mode': 'php',
    'selectors': ['php']
  },
  'text/x-python': {
    'mode': 'python',
    'selectors': [ 'python', 'py' ]
  },
  'text/x-rsrc': {
    'mode': 'r',
    'selectors': ['r']
  },
  'text/x-ruby': {
    'mode': 'ruby',
    'selectors': [ 'ruby', 'rb' ]
  },
  'text/x-sql': {
    'mode': 'sql',
    'selectors': ['sql']
  },
  'text/x-swift': {
    'mode': 'swift',
    'selectors': ['swift']
  },
  'text/x-sh': {
    'mode': 'shell',
    'selectors': [ 'shell', 'sh', 'bash' ]
  },
  'text/x-vb': {
    'mode': 'vb',
    'selectors': [ 'vb\\.net', 'vb', 'visualbasic' ]
  },
  'text/x-yaml': {
    'mode': 'yaml',
    'selectors': [ 'yaml', 'yml' ]
  },
  'text/x-go': {
    'mode': 'go',
    'selectors': ['go']
  },
  'text/x-rustsrc': {
    'mode': 'rust',
    'selectors': [ 'rust', 'rs' ]
  },
  'text/x-julia': {
    'mode': 'julia',
    'selectors': [ 'julia', 'jl' ]
  },
  'text/turtle': {
    'mode': 'turtle',
    'selectors': [ 'turtle', 'ttl' ]
  },
  'application/sparql-query': {
    'mode': 'sparql',
    'selectors': ['sparql']
  },
  'text/x-verilog': {
    'mode': 'verilog',
    'selectors': [ 'verilog', 'v' ]
  },
  'text/x-systemverilog': {
    'mode': 'verilog',
    'selectors': [ 'systemverilog', 'sv' ]
  },
  'text/x-vhdl': {
    'mode': 'vhdl',
    'selectors': [ 'vhdl', 'vhd' ]
  },
  'text/x-tcl': {
    'mode': 'tcl',
    'selectors': ['tcl']
  },
  'text/x-scheme': {
    'mode': 'scheme',
    'selectors': ['scheme']
  },
  'text/x-common-lisp': {
    'mode': 'commonlisp',
    'selectors': [ 'clisp', 'commonlisp' ]
  },
  'application/x-powershell': {
    'mode': 'powershell',
    'selectors': ['powershell']
  },
  'text/x-stsrc': {
    'mode': 'smalltalk',
    'selectors': [ 'smalltalk', 'st' ]
  },
  'application/dart': {
    'mode': 'dart',
    'selectors': [ 'dart', 'dt' ]
  },
  'text/x-toml': {
    'mode': 'toml',
    'selectors': [ 'toml', 'ini' ]
  },
  'text/x-dockerfile': {
    'mode': 'dockerfile',
    'selectors': [ 'docker', 'dockerfile' ]
  },
  'text/x-diff': {
    'mode': 'diff',
    'selectors': ['diff']
  }
};

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  /**
  * MULTIPLEX MODE: This will by default load our internal mode cascade
  * (consisting of the zkn-mode, the spellchecker and finally the gfm
  * mode) OR in code blocks use the respective highlighting modes.
  * @param  {Object} config The previous configuration object
  * @return {CodeMirrorMode}        The multiplex mode
  */
  CodeMirror.defineMode('multiplex', function (config) {
    // Generate a fenced code tag detector for each mode we want to support
    let codeModes = []

    for (let [ mimeType, highlightingMode ] of Object.entries(highlightingModes)) {
      let openRegex = new RegExp('(?:`{3}|~{3})\\s*(' + highlightingMode.selectors.join('|') + ')\\b.*$')
      codeModes.push({
        open: openRegex,
        close: /`{3}|~{3}/,
        mode: CodeMirror.getMode(config, mimeType),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      })
    }

    return CodeMirror.multiplexingMode(
      CodeMirror.getMode(config, 'spellchecker'), // Default mode
      ...codeModes,
      {
        open: /`{3}|~{3}/,
        close: /`{3}|~{3}/,
        mode: CodeMirror.getMode(config, 'text/plain'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      },
      {
        open: /\$\$\s*$/,
        close: /\$\$\s*$/,
        mode: CodeMirror.getMode(config, { name: 'stex', inMathMode: true }),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code multiline-equation'
      }
    )
  })
})
