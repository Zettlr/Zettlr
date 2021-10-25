/* global CodeMirror define */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror multiplex mode
 * CVM-Role:        CodeMirror Mode
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This mode provides the correct syntax highlighting depending
 *                  on the editor contents (code blocks) by multiplexing several
 *                  other modes.
 *
 * END HEADER
 */

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
    'selectors': [ 'r', '{r' ] // NOTE: This is a monkey patch since RStudio will contain that in curly brackets. TODO: Make general
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
  'text/x-perl': {
    'mode': 'perl',
    'selectors': [ 'perl', 'pl' ]
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
  },
  'text/x-octave': {
    'mode': 'octave',
    'selectors': ['octave']
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

  const generateRegexForHighlightMode = require('../util/generate-regex-for-highlight-mode').default

  /*  This function is a copy of CodeMirror.multiplexingMode with a small modification made to
      the token function.  CodeMirror's multiplexing mode addon involves a brute force check of
      every internal mode object, and when these checks are regular expressions on long lines
      they can take a very long amount of time to complete.

      However, Zettlr's use case is unique, because all but a few of the modes have an opening
      regular expression that contains triple backticks (```).  This modified multiplexer takes
      advantage of that commonality to eliminate the bulk of the checks.
  */
  let zettlrMultiplexer = function (outer /*, others */) {
    // Others should be {open, close, mode [, delimStyle] [, innerStyle]} objects
    let others = Array.prototype.slice.call(arguments, 1)

    function indexOf (string, pattern, from, returnEnd) {
      if (typeof pattern === 'string') {
        const found = string.indexOf(pattern, from)
        return returnEnd && found > -1 ? found + pattern.length : found
      }
      const m = pattern.exec(from ? string.slice(from) : string)
      return m ? m.index + from + (returnEnd ? m[0].length : 0) : -1
    }

    return {
      startState: function () {
        return {
          outer: CodeMirror.startState(outer),
          innerActive: null,
          inner: null
        }
      },

      copyState: function (state) {
        return {
          outer: CodeMirror.copyState(outer, state.outer),
          innerActive: state.innerActive,
          inner: state.innerActive && CodeMirror.copyState(state.innerActive.mode, state.inner)
        }
      },

      /*  This token function has been modified from the version that can be found at
          https://github.com/codemirror/CodeMirror/blob/master/addon/mode/multiplex.js
          by performing a check to see if the stream content (the line being tokenized)
          contains three backticks in a row.  If the line does not contain these backticks
          we can guarantee that all of the syntax highlighting regular expressions which
          require `{3} will fail, and so there is no need to perform the expensive check
          on them.  We know that indexOf will return -1.

          The only other component is to know which modes can take advantage of the
          backtick knowledge.  We mark these modes with a .backTicks property.
      */
      token: function (stream, state) {
        if (!state.innerActive) {
          let cutOff = Infinity
          let oldContent = stream.string

          // Check if the stream contains triple backticks ```
          let hasBackticks = oldContent.includes('```')

          for (let i = 0; i < others.length; ++i) {
            let other = others[i]

            // If we do not have the triple backticks in this line AND the mode requires the
            // triple backticks in its open pattern, we know that indexOf will return -1.
            // Because stream.pos does not appear to ever naturally take the value of -1, none
            // of the case statements inside the rest of the for loop will be triggered. Thus
            // we can safely abort this cycle of the loop.
            if (!hasBackticks && other.backTicks) {
              continue
            }

            const found = indexOf(oldContent, other.open, stream.pos)
            if (found === stream.pos) {
              if (!other.parseDelimiters) stream.match(other.open)
              state.innerActive = other

              // Get the outer indent, making sure to handle CodeMirror.Pass
              let outerIndent = 0
              if (outer.indent) {
                const possibleOuterIndent = outer.indent(state.outer, '', '')
                if (possibleOuterIndent !== CodeMirror.Pass) outerIndent = possibleOuterIndent
              }

              state.inner = CodeMirror.startState(other.mode, outerIndent)
              return other.delimStyle && (other.delimStyle + ' ' + other.delimStyle + '-open')
            } else if (found !== -1 && found < cutOff) {
              cutOff = found
            }
          }

          if (cutOff !== Infinity) stream.string = oldContent.slice(0, cutOff)
          const outerToken = outer.token(stream, state.outer)
          if (cutOff !== Infinity) stream.string = oldContent
          return outerToken
        } else {
          const curInner = state.innerActive
          const oldContent = stream.string
          if (!curInner.close && stream.sol()) {
            state.innerActive = state.inner = null
            return this.token(stream, state)
          }
          const found = curInner.close ? indexOf(oldContent, curInner.close, stream.pos, curInner.parseDelimiters) : -1
          if (found === stream.pos && !curInner.parseDelimiters) {
            stream.match(curInner.close)
            state.innerActive = state.inner = null
            return curInner.delimStyle && (curInner.delimStyle + ' ' + curInner.delimStyle + '-close')
          }
          if (found > -1) stream.string = oldContent.slice(0, found)
          let innerToken = curInner.mode.token(stream, state.inner)
          if (found > -1) stream.string = oldContent

          if (found === stream.pos && curInner.parseDelimiters) {
            state.innerActive = state.inner = null
          }

          if (curInner.innerStyle) {
            if (innerToken) innerToken = innerToken + ' ' + curInner.innerStyle
            else innerToken = curInner.innerStyle
          }

          return innerToken
        }
      },

      indent: function (state, textAfter, line) {
        const mode = state.innerActive ? state.innerActive.mode : outer
        if (!mode.indent) return CodeMirror.Pass
        return mode.indent(state.innerActive ? state.inner : state.outer, textAfter, line)
      },

      blankLine: function (state) {
        const mode = state.innerActive ? state.innerActive.mode : outer
        if (mode.blankLine) {
          mode.blankLine(state.innerActive ? state.inner : state.outer)
        }
        if (!state.innerActive) {
          for (let i = 0; i < others.length; ++i) {
            const other = others[i]
            if (other.open === '\n') {
              state.innerActive = other
              state.inner = CodeMirror.startState(other.mode, mode.indent ? mode.indent(state.outer, '', '') : 0)
            }
          }
        } else if (state.innerActive.close === '\n') {
          state.innerActive = state.inner = null
        }
      },

      electricChars: outer.electricChars,

      innerMode: function (state) {
        return state.inner ? { state: state.inner, mode: state.innerActive.mode } : { state: state.outer, mode: outer }
      }
    }
  }

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
      codeModes.push({
        open: generateRegexForHighlightMode(highlightingMode.selectors),
        close: /`{3}|~{3}/,
        mode: CodeMirror.getMode(config, mimeType),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code',

        // To take advantage of the modified multiplexer, we add a property here to mark that this
        // opening regex will not be necessary if there are no triple backticks in the line being checked
        backTicks: true
      })
    }

    return zettlrMultiplexer(
      CodeMirror.getMode(config, 'spellchecker'), // Default mode
      ...codeModes,
      {
        open: /`{3}|~{3}/,
        close: /`{3}|~{3}/,
        mode: CodeMirror.getMode(config, 'text/plain'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code',

        // To take advantage of the modified multiplexer, we add a property here to mark that this
        // opening regex will not be necessary if there are no triple backticks in the line being checked
        backTicks: true
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
