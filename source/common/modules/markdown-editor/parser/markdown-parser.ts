/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown Parser
 * CVM-Role:        Lezer Parser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the main parser for Markdown documents. Most of the
 *                  code in here is boilerplate that adds various code
 *                  highlighting languages to the parser.
 *
 * END HEADER
 */

import { customTags } from '../util/custom-tags'
import {
  StreamLanguage,
  type LanguageSupport,
  type Language,
  type LanguageDescription
} from '@codemirror/language'

// Import all the languages, first the "new" ones
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { php } from '@codemirror/lang-php'
import { python } from '@codemirror/lang-python'
import { cssLanguage } from '@codemirror/lang-css'
import { javascriptLanguage, typescriptLanguage } from '@codemirror/lang-javascript'
import { jsonLanguage } from '@codemirror/lang-json'
// Now from the legacy modes package
import { c, cpp, csharp, java, kotlin, objectiveC, dart, scala } from '@codemirror/legacy-modes/mode/clike'
import { clojure } from '@codemirror/legacy-modes/mode/clojure'
import { cobol } from '@codemirror/legacy-modes/mode/cobol'
import { elm } from '@codemirror/legacy-modes/mode/elm'
import { fSharp } from '@codemirror/legacy-modes/mode/mllike'
import { fortran } from '@codemirror/legacy-modes/mode/fortran'
import { haskell } from '@codemirror/legacy-modes/mode/haskell'
import { sCSS, less } from '@codemirror/legacy-modes/mode/css'
import { xml, html } from '@codemirror/legacy-modes/mode/xml'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { r } from '@codemirror/legacy-modes/mode/r'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { sql } from '@codemirror/legacy-modes/mode/sql'
import { swift } from '@codemirror/legacy-modes/mode/swift'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { vb } from '@codemirror/legacy-modes/mode/vb'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { go } from '@codemirror/legacy-modes/mode/go'
import { rust } from '@codemirror/legacy-modes/mode/rust'
import { julia } from '@codemirror/legacy-modes/mode/julia'
import { perl } from '@codemirror/legacy-modes/mode/perl'
import { turtle } from '@codemirror/legacy-modes/mode/turtle'
import { sparql } from '@codemirror/legacy-modes/mode/sparql'
import { verilog } from '@codemirror/legacy-modes/mode/verilog'
import { vhdl } from '@codemirror/legacy-modes/mode/vhdl'
import { tcl } from '@codemirror/legacy-modes/mode/tcl'
import { scheme } from '@codemirror/legacy-modes/mode/scheme'
import { commonLisp } from '@codemirror/legacy-modes/mode/commonlisp'
import { powerShell } from '@codemirror/legacy-modes/mode/powershell'
import { smalltalk } from '@codemirror/legacy-modes/mode/smalltalk'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import { diff } from '@codemirror/legacy-modes/mode/diff'
import { octave } from '@codemirror/legacy-modes/mode/octave'
import { lua } from '@codemirror/legacy-modes/mode/lua'

// Additional parser
import { citationParser } from './citation-parser'
import { footnoteParser, footnoteRefParser } from './footnote-parser'
import { plainLinkParser } from './plain-link-parser'
import { frontmatterParser } from './frontmatter-parser'
import { inlineMathParser, blockMathParser } from './math-parser'
import { sloppyParser } from './sloppy-parser'
import { gridTableParser, pipeTableParser } from './pandoc-table-parser'
import { zknLinkParser } from './zkn-link-parser'
import { pandocAttributesParser } from './pandoc-attributes-parser'
import { highlightParser } from './highlight-parser'
import { zknTagParser } from './zkn-tag-parser'

const codeLanguages: Array<{ mode: Language|LanguageDescription|null, selectors: string[] }> = [
  {
    // Hear me out: There may be no mermaid syntax highlighting, BUT we need it
    // to be inside a 'FencedCode' Syntax node so that our renderer can pick it
    // up. By defining an empty StreamParser, we can ensure that there will be
    // such a structure, even if it's basically just plain text.
    mode: StreamLanguage.define({ token (stream, state) { stream.skipToEnd(); return null } }),
    selectors: ['mermaid']
  },
  { mode: cssLanguage, selectors: ['css'] },
  { mode: javascriptLanguage, selectors: [ 'javascript', 'js', 'node' ] },
  { mode: jsonLanguage, selectors: ['json'] },
  { mode: markdownLanguage, selectors: [ 'markdown', 'md' ] },
  { mode: php().language, selectors: ['php'] },
  { mode: python().language, selectors: [ 'python', 'py' ] },
  { mode: StreamLanguage.define(c), selectors: ['c'] },
  { mode: StreamLanguage.define(clojure), selectors: ['clojure'] },
  { mode: StreamLanguage.define(cobol), selectors: ['cobol'] },
  { mode: StreamLanguage.define(commonLisp), selectors: [ 'clisp', 'commonlisp' ] },
  { mode: StreamLanguage.define(cpp), selectors: [ 'c++', 'cpp' ] },
  { mode: StreamLanguage.define(csharp), selectors: [ 'c#', 'csharp', 'cs' ] },
  { mode: StreamLanguage.define(dart), selectors: [ 'dart', 'dt' ] },
  { mode: StreamLanguage.define(diff), selectors: ['diff'] },
  { mode: StreamLanguage.define(dockerFile), selectors: [ 'docker', 'dockerfile' ] },
  { mode: StreamLanguage.define(elm), selectors: ['elm'] },
  { mode: StreamLanguage.define(fortran), selectors: ['fortran'] },
  { mode: StreamLanguage.define(fSharp), selectors: [ 'f#', 'fsharp' ] },
  { mode: StreamLanguage.define(go), selectors: ['go'] },
  { mode: StreamLanguage.define(haskell), selectors: [ 'haskell', 'hs' ] },
  { mode: StreamLanguage.define(html), selectors: ['html'] },
  { mode: StreamLanguage.define(java), selectors: ['java'] },
  { mode: StreamLanguage.define(julia), selectors: [ 'julia', 'jl' ] },
  { mode: StreamLanguage.define(kotlin), selectors: [ 'kotlin', 'kt' ] },
  { mode: StreamLanguage.define(less), selectors: ['less'] },
  { mode: StreamLanguage.define(lua), selectors: ['lua'] },
  { mode: StreamLanguage.define(objectiveC), selectors: [ 'objective-c', 'objectivec', 'objc' ] },
  { mode: StreamLanguage.define(octave), selectors: ['octave'] },
  { mode: StreamLanguage.define(perl), selectors: [ 'perl', 'pl' ] },
  { mode: StreamLanguage.define(powerShell), selectors: ['powershell'] },
  { mode: StreamLanguage.define(r), selectors: ['r'] },
  { mode: StreamLanguage.define(ruby), selectors: [ 'ruby', 'rb' ] },
  { mode: StreamLanguage.define(rust), selectors: [ 'rust', 'rs' ] },
  { mode: StreamLanguage.define(scala), selectors: ['scala'] },
  { mode: StreamLanguage.define(scheme), selectors: ['scheme'] },
  { mode: StreamLanguage.define(sCSS), selectors: ['scss'] },
  { mode: StreamLanguage.define(shell), selectors: [ 'shell', 'sh', 'bash' ] },
  { mode: StreamLanguage.define(smalltalk), selectors: [ 'smalltalk', 'st' ] },
  { mode: StreamLanguage.define(sparql), selectors: ['sparql'] },
  { mode: StreamLanguage.define(sql({})), selectors: ['sql'] },
  { mode: StreamLanguage.define(stex), selectors: [ 'latex', 'tex' ] },
  { mode: StreamLanguage.define(swift), selectors: ['swift'] },
  { mode: StreamLanguage.define(tcl), selectors: ['tcl'] },
  { mode: StreamLanguage.define(toml), selectors: [ 'toml', 'ini' ] },
  { mode: StreamLanguage.define(turtle), selectors: [ 'turtle', 'ttl' ] },
  { mode: StreamLanguage.define(vb), selectors: [ 'vb.net', 'vb', 'visualbasic' ] },
  { mode: StreamLanguage.define(verilog), selectors: [ 'verilog', 'v' ] },
  { mode: StreamLanguage.define(vhdl), selectors: [ 'vhdl', 'vhd' ] },
  { mode: StreamLanguage.define(xml), selectors: ['xml'] },
  { mode: StreamLanguage.define(yaml), selectors: [ 'yaml', 'yml' ] },
  { mode: typescriptLanguage, selectors: [ 'typescript', 'ts' ] }
]

// TIP: Uncomment the following line to get a full list of all unique characters
// that are capable of belonging to a selector
// console.log([...new Set(codeLanguages.map(x => x.selectors).flat().join('').split(''))])

// This file returns a syntax extension that provides parsing and syntax
// capabilities
export default function markdownParser (): LanguageSupport {
  return markdown({
    base: markdownLanguage,
    codeLanguages: (infoString) => {
      // infostrings must start with the language and can be surrounded by curly
      // brackets. We just extract everything from the beginning that is an
      // allowed selector-part
      const match = /^{?([a-z.#+-]+)/.exec(infoString.toLowerCase())
      if (match === null) {
        return null
      }

      // Return an adequate language
      for (const entry of codeLanguages) {
        if (entry.selectors.includes(match[1])) {
          return entry.mode
        }
      }

      return null
    },
    extensions: {
      parseBlock: [
        // This BlockParser parses YAML frontmatters
        frontmatterParser,
        // This BlockParser parses math blocks
        blockMathParser,
        footnoteRefParser,
        gridTableParser,
        pipeTableParser
      ],
      parseInline: [
        // Add inline parsers that add AST elements for various additional types
        inlineMathParser,
        footnoteParser,
        citationParser,
        plainLinkParser,
        sloppyParser,
        zknLinkParser,
        zknTagParser,
        pandocAttributesParser,
        highlightParser
      ],
      // We have to notify the markdown parser about the additional Node Types
      // that the YAML block parser utilizes
      defineNodes: [
        { name: 'YAMLFrontmatterStart', style: customTags.YAMLFrontmatterStart },
        { name: 'YAMLFrontmatterEnd', style: customTags.YAMLFrontmatterEnd },
        { name: 'YAMLFrontmatterKey', style: customTags.YAMLFrontmatterKey },
        { name: 'YAMLFrontmatterString', style: customTags.YAMLFrontmatterString },
        { name: 'YAMLFrontmatterBoolean', style: customTags.YAMLFrontmatterBoolean },
        { name: 'YAMLFrontmatterNumber', style: customTags.YAMLFrontmatterNumber },
        { name: 'YAMLFrontmatterPlain', style: customTags.YAMLFrontmatterPlain },
        { name: 'YAMLFrontmatterPair', style: customTags.YAMLFrontmatterPair },
        { name: 'YAMLFrontmatterSeq', style: customTags.YAMLFrontmatterSeq },
        { name: 'YAMLFrontmatterMap', style: customTags.YAMLFrontmatterMap },
        { name: 'Citation', style: customTags.Citation },
        { name: 'Highlight', style: customTags.Highlight },
        { name: 'HighlightContent', style: customTags.HighlightContent },
        { name: 'Footnote', style: customTags.Footnote },
        { name: 'FootnoteRef', style: customTags.FootnoteRef },
        { name: 'FootnoteRefLabel', style: customTags.FootnoteRefLabel },
        { name: 'FootnoteRefBody', style: customTags.FootnoteRefBody },
        { name: 'ZknLink', style: customTags.ZknLink },
        { name: 'ZknLinkContent', style: customTags.ZknLinkContent },
        { name: 'ZknTag', style: customTags.ZknTag },
        { name: 'ZknTagContent', style: customTags.ZknTagContent },
        { name: 'PandocAttribute', style: customTags.PandocAttribute }
      ]
    }
  })
}
