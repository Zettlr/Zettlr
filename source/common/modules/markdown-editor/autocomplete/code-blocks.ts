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

import { Completion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import { AutocompletePlugin } from '.'

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
    const delim = view.state.doc.sliceString(from - 3, from)
    view.dispatch({
      changes: [{ from, to, insert: infoString + '\n\n' + delim }],
      selection: { anchor: from + infoString.length + 1 }
    })
  }
}

const entries: Completion[] = [
  { apply: generate(''), label: 'No highlighting' }, // TODO: translate
  { apply: generate('javascript'), label: 'JavaScript/Node.JS' },
  { apply: generate('json'), label: 'JSON' },
  { apply: generate('typescript'), label: 'TypeScript' },
  { apply: generate('c'), label: 'C' },
  { apply: generate('cpp'), label: 'C++' },
  { apply: generate('csharp'), label: 'C#' },
  { apply: generate('clojure'), label: 'Clojure' },
  { apply: generate('elm'), label: 'Elm' },
  { apply: generate('fsharp'), label: 'F#' },
  { apply: generate('fortran'), label: 'Fortran' },
  { apply: generate('java'), label: 'Java' },
  { apply: generate('kotlin'), label: 'Kotlin' },
  { apply: generate('haskell'), label: 'Haskell' },
  { apply: generate('objectivec'), label: 'Objective-C' },
  { apply: generate('scala'), label: 'Scala' },
  { apply: generate('css'), label: 'CSS' },
  { apply: generate('scss'), label: 'SCSS' },
  { apply: generate('less'), label: 'LESS' },
  { apply: generate('html'), label: 'HTML' },
  { apply: generate('markdown'), label: 'Markdown' },
  { apply: generate('mermaid'), label: 'Mermaid' },
  { apply: generate('xml'), label: 'XML' },
  { apply: generate('tex'), label: 'TeX' },
  { apply: generate('php'), label: 'PHP' },
  { apply: generate('python'), label: 'Python' },
  { apply: generate('r'), label: 'R' },
  { apply: generate('ruby'), label: 'Ruby' },
  { apply: generate('sql'), label: 'SQL' },
  { apply: generate('swift'), label: 'Swift' },
  { apply: generate('bash'), label: 'Bash' },
  { apply: generate('visualbasic'), label: 'Visual Basic' },
  { apply: generate('yaml'), label: 'YAML' },
  { apply: generate('go'), label: 'Go' },
  { apply: generate('rust'), label: 'Rust' },
  { apply: generate('perl'), label: 'Perl' },
  { apply: generate('julia'), label: 'Julia' },
  { apply: generate('turtle'), label: 'Turtle' },
  { apply: generate('sparql'), label: 'SparQL' },
  { apply: generate('verilog'), label: 'Verilog' },
  { apply: generate('systemverilog'), label: 'SystemVerilog' },
  { apply: generate('vhdl'), label: 'VHDL' },
  { apply: generate('tcl'), label: 'TCL' },
  { apply: generate('scheme'), label: 'Scheme' },
  { apply: generate('clisp'), label: 'Common Lisp' },
  { apply: generate('powershell'), label: 'Powershell' },
  { apply: generate('smalltalk'), label: 'Smalltalk' },
  { apply: generate('dart'), label: 'Dart' },
  { apply: generate('toml'), label: 'TOML/INI' },
  { apply: generate('docker'), label: 'Dockerfile' },
  { apply: generate('diff'), label: 'Diff' }
]

export const codeBlocks: AutocompletePlugin = {
  applies (ctx) {
    const line = ctx.state.doc.lineAt(ctx.pos)
    const ch = ctx.pos - line.from
    // We're not at the very start of the document, so let's see what the line
    // above the position says. TODO: For this we have to check if the previous
    // line is already part of a codeblock
    if ((line.text.startsWith('```') || line.text.startsWith('~~~')) && ch === 3) {
      return ctx.pos
    } else {
      return false
    }
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query)
    })
  }
}
