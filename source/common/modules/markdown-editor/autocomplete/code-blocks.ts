/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Code Block Autocomplete
 * CVM-Role:        Autocomplete Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin manages code blocks.
 *
 * END HEADER
 */

import { type Completion } from '@codemirror/autocomplete'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import { type AutocompletePlugin } from '.'

/**
 * This utility function just takes an info-string that should be placed after
 * the initial codeblock delimiters, and inserts that, two linebreaks, and the
 * end of the codeblock, plus placing the cursor in between.
 *
 * @param   {string}      infoString  The infostring to use
 */
function generate (infoString: string): (view: EditorView, completion: Completion, from: number, to: number) => void {
  return (view, completion, from, to) => {
    // This apply function basically just makes sure that, after the actual
    // insertion, we can add a blank line, add the end of the block delimiters,
    // and position the cursor correctly.
    const line = view.state.doc.lineAt(from)
    const delim = /^\s*(`{3,}|~{3,})/.exec(line.text)?.[1] ?? '```'
    view.dispatch({
      changes: [{ from, to, insert: infoString + '\n\n' + delim }],
      selection: { anchor: from + infoString.length + 1 }
    })
  }
}

const codeEntries: Completion[] = [
  // Keep the plain code option first when CodeMirror ranks an empty query.
  { apply: generate(''), label: trans('No highlighting'), boost: 1 },
  { apply: generate('bash'), label: 'Bash' },
  { apply: generate('c'), label: 'C' },
  { apply: generate('clisp'), label: 'Common Lisp' },
  { apply: generate('clojure'), label: 'Clojure' },
  { apply: generate('cpp'), label: 'C++' },
  { apply: generate('csharp'), label: 'C#' },
  { apply: generate('css'), label: 'CSS' },
  { apply: generate('dart'), label: 'Dart' },
  { apply: generate('diff'), label: 'Diff' },
  { apply: generate('docker'), label: 'Dockerfile' },
  { apply: generate('elixir'), label: 'Elixir' },
  { apply: generate('elm'), label: 'Elm' },
  { apply: generate('fortran'), label: 'Fortran' },
  { apply: generate('fsharp'), label: 'F#' },
  { apply: generate('go'), label: 'Go' },
  { apply: generate('haskell'), label: 'Haskell' },
  { apply: generate('hcl'), label: 'HCL' },
  { apply: generate('html'), label: 'HTML' },
  { apply: generate('java'), label: 'Java' },
  { apply: generate('javascript'), label: 'JavaScript/Node.JS' },
  { apply: generate('json'), label: 'JSON' },
  { apply: generate('julia'), label: 'Julia' },
  { apply: generate('kotlin'), label: 'Kotlin' },
  { apply: generate('less'), label: 'LESS' },
  { apply: generate('lua'), label: 'Lua' },
  { apply: generate('markdown'), label: 'Markdown' },
  { apply: generate('math'), label: 'MathTeX' },
  { apply: generate('mermaid'), label: 'Mermaid' },
  { apply: generate('nix'), label: 'Nix' },
  { apply: generate('objectivec'), label: 'Objective-C' },
  { apply: generate('pascal'), label: 'Pascal' },
  { apply: generate('perl'), label: 'Perl' },
  { apply: generate('php'), label: 'PHP' },
  { apply: generate('powershell'), label: 'Powershell' },
  { apply: generate('python'), label: 'Python' },
  { apply: generate('r'), label: 'R' },
  { apply: generate('ruby'), label: 'Ruby' },
  { apply: generate('rust'), label: 'Rust' },
  { apply: generate('scala'), label: 'Scala' },
  { apply: generate('scheme'), label: 'Scheme' },
  { apply: generate('scss'), label: 'SCSS' },
  { apply: generate('smalltalk'), label: 'Smalltalk' },
  { apply: generate('sparql'), label: 'SparQL' },
  { apply: generate('sql'), label: 'SQL' },
  { apply: generate('swift'), label: 'Swift' },
  { apply: generate('systemverilog'), label: 'SystemVerilog' },
  { apply: generate('tcl'), label: 'TCL' },
  { apply: generate('terraform'), label: 'Terraform' },
  { apply: generate('tex'), label: 'TeX' },
  { apply: generate('toml'), label: 'TOML/INI' },
  { apply: generate('turtle'), label: 'Turtle' },
  { apply: generate('typescript'), label: 'TypeScript' },
  { apply: generate('verilog'), label: 'Verilog' },
  { apply: generate('vhdl'), label: 'VHDL' },
  { apply: generate('visualbasic'), label: 'Visual Basic' },
  { apply: generate('xml'), label: 'XML' },
  { apply: generate('yaml'), label: 'YAML' }
]

export const codeBlocks: AutocompletePlugin = {
  filter: true,
  applies (ctx) {
    const token = ctx.tokenBefore([ 'CodeInfo', 'CodeMark' ])

    if (token?.type.is('CodeInfo') === true) {
      const offset = token.text.startsWith('{') ? 1 : 0

      return token.from + offset
    }

    if (token?.type.is('CodeMark') === true && token.text.length >= 3) {
      return ctx.pos
    }

    return false
  },
  entries () {
    return codeEntries
  }
}
