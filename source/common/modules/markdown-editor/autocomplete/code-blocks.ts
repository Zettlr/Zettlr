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
    const delim = view.state.doc.sliceString(from - 3, from)
    view.dispatch({
      changes: [{ from, to, insert: infoString + '\n\n' + delim }],
      selection: { anchor: from + infoString.length + 1 }
    })
  }
}

function getEntries (): Completion[] {
  return [
    { apply: generate(''), label: trans('No highlighting') },
    { apply: generate('actdiag'), label: 'ActDiag' },
    { apply: generate('bash'), label: 'Bash' },
    { apply: generate('blockdiag'), label: 'BlockDiag' },
    { apply: generate('bpmn'), label: 'BPMN' },
    { apply: generate('bytefield'), label: 'Bytefield' },
    { apply: generate('c'), label: 'C' },
    { apply: generate('clisp'), label: 'Common Lisp' },
    { apply: generate('clojure'), label: 'Clojure' },
    { apply: generate('cpp'), label: 'C++' },
    { apply: generate('csharp'), label: 'C#' },
    { apply: generate('c4plantuml'), label: 'C4 with PlantUML' },
    { apply: generate('css'), label: 'CSS' },
    { apply: generate('dart'), label: 'Dart' },
    { apply: generate('dbml'), label: 'DBML' },
    { apply: generate('diff'), label: 'Diff' },
    { apply: generate('ditaa'), label: 'Ditaa' },
    { apply: generate('docker'), label: 'Dockerfile' },
    { apply: generate('d2'), label: 'D2' },
    { apply: generate('elm'), label: 'Elm' },
    { apply: generate('erd'), label: 'ERD' },
    { apply: generate('excalidraw'), label: 'Excalidraw' },
    { apply: generate('fortran'), label: 'Fortran' },
    { apply: generate('fsharp'), label: 'F#' },
    { apply: generate('go'), label: 'Go' },
    { apply: generate('graphviz'), label: 'GraphViz' },
    { apply: generate('haskell'), label: 'Haskell' },
    { apply: generate('html'), label: 'HTML' },
    { apply: generate('java'), label: 'Java' },
    { apply: generate('javascript'), label: 'JavaScript/Node.JS' },
    { apply: generate('json'), label: 'JSON' },
    { apply: generate('julia'), label: 'Julia' },
    { apply: generate('kotlin'), label: 'Kotlin' },
    { apply: generate('less'), label: 'LESS' },
    { apply: generate('lua'), label: 'Lua' },
    { apply: generate('markdown'), label: 'Markdown' },
    { apply: generate('mermaid'), label: 'Mermaid' },
    { apply: generate('nomnoml'), label: 'Nomnoml' },
    { apply: generate('nwdiag'), label: 'NwDiag' },
    { apply: generate('objectivec'), label: 'Objective-C' },
    { apply: generate('packetdiag'), label: 'PacketDiag' },
    { apply: generate('perl'), label: 'Perl' },
    { apply: generate('php'), label: 'PHP' },
    { apply: generate('pikchr'), label: 'Pikchr' },
    { apply: generate('plantuml'), label: 'PlantUML' },
    { apply: generate('powershell'), label: 'Powershell' },
    { apply: generate('python'), label: 'Python' },
    { apply: generate('r'), label: 'R' },
    { apply: generate('rackdiag'), label: 'RackDiag' },
    { apply: generate('ruby'), label: 'Ruby' },
    { apply: generate('rust'), label: 'Rust' },
    { apply: generate('scala'), label: 'Scala' },
    { apply: generate('scheme'), label: 'Scheme' },
    { apply: generate('scss'), label: 'SCSS' },
    { apply: generate('seqdiag'), label: 'SeqDiag' },
    { apply: generate('smalltalk'), label: 'Smalltalk' },
    { apply: generate('sparql'), label: 'SparQL' },
    { apply: generate('sql'), label: 'SQL' },
    { apply: generate('structurizr'), label: 'Structurizr' },
    { apply: generate('svgbob'), label: 'Svgbob' },
    { apply: generate('swift'), label: 'Swift' },
    { apply: generate('systemverilog'), label: 'SystemVerilog' },
    { apply: generate('tcl'), label: 'TCL' },
    { apply: generate('tikz'), label: 'TikZ' },
    { apply: generate('tex'), label: 'TeX' },
    { apply: generate('toml'), label: 'TOML/INI' },
    { apply: generate('turtle'), label: 'Turtle' },
    { apply: generate('typescript'), label: 'TypeScript' },
    { apply: generate('vega'), label: 'Vega' },
    { apply: generate('vegalite'), label: 'Vega-Lite' },
    { apply: generate('verilog'), label: 'Verilog' },
    { apply: generate('vhdl'), label: 'VHDL' },
    { apply: generate('visualbasic'), label: 'Visual Basic' },
    { apply: generate('wavedrom'), label: 'WaveDrom' },
    { apply: generate('wireviz'), label: 'WireViz' },
    { apply: generate('xml'), label: 'XML' },
    { apply: generate('yaml'), label: 'YAML' }
  ]
}

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
    return getEntries().filter(entry => {
      return entry.label.toLowerCase().includes(query)
    })
  }
}
