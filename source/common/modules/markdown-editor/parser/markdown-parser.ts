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
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
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
import { pascal } from '@codemirror/legacy-modes/mode/pascal'

// Additional parser
import { citationParser } from './citation-parser'
import { footnoteParser, footnoteRefParser } from './footnote-parser'
import { frontmatterParser, yamlCodeParse } from './frontmatter-parser'
import { inlineMathParser, blockMathParser } from './math-parser'
import { sloppyParser } from './sloppy-parser'
import { gridTableParser, pipeTableParser } from './pandoc-table-parser'
import { type ZknLinkParserConfig, zknLinkParser } from './zkn-link-parser'
import { pandocAttributesParser } from './pandoc-attributes-parser'
import { highlightParser } from './highlight-parser'
import { zknTagParser } from './zkn-tag-parser'

const codeLanguages: Array<{ mode: Language|LanguageDescription|null, selectors: string[] }> = [
  {
    // Hear me out: There may be no mermaid syntax highlighting, BUT we need it
    // to be inside a 'FencedCode' Syntax node so that our renderer can pick it
    // up. By defining an empty StreamParser, we can ensure that there will be
    // such a structure, even if it's basically just plain text.
    mode: StreamLanguage.define({ token (stream, _state) { stream.skipToEnd(); return null } }),
    selectors: ['mermaid']
  },
  { mode: css().language, selectors: ['css'] },
  { mode: javascript().language, selectors: [ 'javascript', 'js', 'node' ] },
  { mode: json().language, selectors: ['json'] },
  { mode: markdownLanguage, selectors: [ 'markdown', 'md' ] },
  // NOTE: The PHP parser usually expects the PHP code to start with <?, unless "plain" is set
  { mode: php({ plain: true }).language, selectors: ['php'] },
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
  { mode: StreamLanguage.define(pascal), selectors: ['pascal'] },
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
  { mode: yaml().language, selectors: [ 'yaml', 'yml' ] },
  { mode: javascript({ typescript: true }).language, selectors: [ 'typescript', 'ts' ] }
]

export interface MarkdownParserConfig {
  zknLinkParserConfig?: ZknLinkParserConfig
}

// TIP: Uncomment the following line to get a full list of all unique characters
// that are capable of belonging to a selector
// console.log([...new Set(codeLanguages.map(x => x.selectors).flat().join('').split(''))])

// This file returns a syntax extension that provides parsing and syntax
// capabilities
export default function markdownParser (config?: MarkdownParserConfig): LanguageSupport {
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

      // Additional check: For simple info strings, we need to use the entire
      // match, but if the user has opted for a fenced code attribute, we need
      // to account for the dot in the beginning.
      const infoLang = match[1].startsWith('.') ? match[1].slice(1) : match[1]

      // Return an adequate language
      for (const entry of codeLanguages) {
        if (entry.selectors.includes(infoLang)) {
          return entry.mode
        }
      }

      return null
    },
    addKeymap: false,
    extensions: {
      // yamlCodeParse is a wrapper that scans the document for the existence of
      // a YAML frontmatter and then parses its contents. NOTE: Since a single
      // MarkdownConfig only accepts one parse, I could either add additional
      // logic to a generalized parser, or start passing additional config
      // options here, since "extensions" also takes an array.
      wrap: yamlCodeParse(),
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
        sloppyParser,
        zknLinkParser(config?.zknLinkParserConfig),
        zknTagParser,
        pandocAttributesParser,
        highlightParser
      ],
      // We have to notify the markdown parser about the additional Node Types
      // that the YAML block parser utilizes
      // NOTE: Changes here must be reflected in util/custom-tags.ts and theme/syntax.ts!
      defineNodes: [
        { name: 'YAMLFrontmatter' },
        { name: 'YAMLFrontmatterStart', style: customTags.YAMLFrontmatterStart },
        { name: 'YAMLFrontmatterEnd', style: customTags.YAMLFrontmatterEnd },
        // Citation elements
        { name: 'Citation', style: { 'Citation/...': customTags.Citation } },
        { name: 'CitationMark', style: customTags.CitationMark },
        { name: 'CitationPrefix', style: customTags.CitationPrefix },
        { name: 'CitationSuppressAuthorFlag', style: customTags.CitationSuppressAuthorFlag },
        { name: 'CitationAtSign', style: customTags.CitationAtSign },
        { name: 'CitationCitekey', style: customTags.CitationCitekey },
        { name: 'CitationLocator', style: customTags.CitationLocator },
        { name: 'CitationSuffix', style: customTags.CitationSuffix },
        { name: 'HighlightMark', style: customTags.HighlightMark },
        // NOTE: The convention {TagName}/... means that the corresponding styles
        // from the syntax theme get assigned to all child nodes that are contained
        // within this node as well. The default is to only style otherwise "empty"
        // spans of plain text.
        { name: 'HighlightContent', style: { 'HighlightContent/...': customTags.HighlightContent } },
        { name: 'Footnote', style: customTags.Footnote },
        { name: 'FootnoteRef', style: customTags.FootnoteRef },
        { name: 'FootnoteRefLabel', style: customTags.FootnoteRefLabel },
        { name: 'FootnoteRefBody', style: customTags.FootnoteRefBody },
        { name: 'ZknLink', style: customTags.ZknLink },
        { name: 'ZknLinkContent', style: customTags.ZknLinkContent },
        { name: 'ZknLinkTitle', style: customTags.ZknLinkTitle },
        { name: 'ZknLinkPipe', style: customTags.ZknLinkPipe },
        { name: 'ZknTag', style: customTags.ZknTag },
        { name: 'ZknTagContent', style: customTags.ZknTagContent },
        { name: 'PandocAttribute', style: customTags.PandocAttribute }
      ]
    }
  })
}
