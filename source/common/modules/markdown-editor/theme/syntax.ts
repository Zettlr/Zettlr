/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Syntax Highlighting
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module defines the syntax highlighting "themes" for
 *                  code and Markdown files.
 *
 * END HEADER
 */

import { tags } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { customTags } from '../util/custom-tags'
import { type Extension } from '@codemirror/state'

// Instead of utilizing JS styling, we simply apply class names, in order to
// retain our users' ability to apply custom CSS.
const markdownTheme = HighlightStyle.define([
  { tag: tags.angleBracket, class: 'cm-angle-bracket' },
  { tag: tags.annotation, class: 'cm-annotation' },
  { tag: tags.arithmeticOperator, class: 'cm-arithmetic-operator' },
  { tag: tags.atom, class: 'cm-atom' },
  { tag: tags.attributeName, class: 'cm-attribute-name' },
  { tag: tags.attributeValue, class: 'cm-attribute-value' },
  { tag: tags.bitwiseOperator, class: 'cm-bitwise-operator' },
  { tag: tags.blockComment, class: 'cm-block-comment' },
  { tag: tags.bool, class: 'cm-bool' },
  { tag: tags.brace, class: 'cm-brace' },
  { tag: tags.emphasis, class: 'cm-emphasis' },
  { tag: tags.strong, class: 'cm-strong' },
  { tag: tags.heading, class: 'cm-heading' },
  { tag: tags.heading1, class: 'cm-header-1' },
  { tag: tags.heading2, class: 'cm-header-2' },
  { tag: tags.heading3, class: 'cm-header-3' },
  { tag: tags.heading4, class: 'cm-header-4' },
  { tag: tags.heading5, class: 'cm-header-5' },
  { tag: tags.heading6, class: 'cm-header-6' },
  { tag: tags.blockComment, class: 'cm-block-comment' },
  { tag: tags.contentSeparator, class: 'cm-hr' },
  { tag: tags.url, class: 'cm-url' },
  { tag: tags.link, class: 'cm-link' },
  { tag: tags.quote, class: 'cm-quote' },
  { tag: tags.list, class: 'cm-list' },
  { tag: tags.monospace, class: 'cm-fenced-code' },
  { tag: tags.emphasis, class: 'cm-emphasis' },
  { tag: tags.strong, class: 'cm-strong' },
  // Styling for YAML frontmatters
  { tag: customTags.YAMLFrontmatter, class: 'cm-yaml-frontmatter' },
  { tag: customTags.YAMLFrontmatterStart, class: 'cm-yaml-frontmatter-start' },
  { tag: customTags.YAMLFrontmatterEnd, class: 'cm-yaml-frontmatter-end' },
  // Codeblocks
  { tag: tags.labelName, class: 'cm-info-string' }, // CodeInfo (info string)
  { tag: tags.processingInstruction, class: 'cm-code-mark' }, // CodeMark (i.e. ```) but also table delimiters
  { tag: tags.monospace, class: 'cm-monospace' }, // CodeText (i.e. code block content)
  // NOTE: Changes here must be reflected in util/custom-tags.ts and parser/markdown-parser.ts
  // Tables TODO
  // Footnotes
  { tag: customTags.Footnote, class: 'footnote' },
  { tag: customTags.FootnoteRef, class: 'footnote-ref' },
  { tag: customTags.FootnoteRefLabel, class: 'footnote-ref-label' },
  { tag: customTags.FootnoteRefBody, class: 'footnote-ref-body' },
  { tag: customTags.ZknLinkContent, class: 'cm-zkn-link' },
  { tag: customTags.ZknTagContent, class: 'cm-zkn-tag' },
  { tag: customTags.PandocAttribute, class: 'pandoc-attribute' },
  { tag: customTags.HighlightMark, class: 'cm-highlight cm-highlight-mark' },
  { tag: customTags.HighlightContent, class: 'cm-highlight' },
  { tag: customTags.Citation, class: 'cm-citation' },
  { tag: customTags.CitationMark, class: 'cm-citation-mark' },
  { tag: customTags.CitationPrefix, class: 'cm-citation-prefix' },
  { tag: customTags.CitationSuppressAuthorFlag, class: 'cm-citation-suppress-author-flag' },
  { tag: customTags.CitationAtSign, class: 'cm-citation-at-sign' },
  { tag: customTags.CitationCitekey, class: 'cm-citation-citekey' },
  { tag: customTags.CitationLocator, class: 'cm-citation-locator' },
  { tag: customTags.CitationSuffix, class: 'cm-citation-suffix' },
])

const codeTheme = HighlightStyle.define([
  { tag: tags.comment, class: 'cm-comment' },
  { tag: tags.lineComment, class: 'cm-line-comment' },
  { tag: tags.blockComment, class: 'cm-block-comment' },
  { tag: tags.docComment, class: 'cm-doc-comment' },
  { tag: tags.name, class: 'cm-name' },
  { tag: tags.variableName, class: 'cm-variable-name' },
  { tag: tags.typeName, class: 'cm-type-name' },
  { tag: tags.tagName, class: 'cm-tag-name' },
  { tag: tags.propertyName, class: 'cm-property-name' },
  { tag: tags.attributeName, class: 'cm-attribute-name' },
  { tag: tags.className, class: 'cm-class-name' },
  { tag: tags.labelName, class: 'cm-label-name' },
  { tag: tags.namespace, class: 'cm-namespace' },
  { tag: tags.macroName, class: 'cm-macro-name' },
  { tag: tags.literal, class: 'cm-literal' },
  { tag: tags.string, class: 'cm-string' },
  { tag: tags.docString, class: 'cm-doc-string' },
  { tag: tags.character, class: 'cm-character' },
  { tag: tags.attributeValue, class: 'cm-attribute-value' },
  { tag: tags.number, class: 'cm-number' },
  { tag: tags.integer, class: 'cm-integer' },
  { tag: tags.float, class: 'cm-float' },
  { tag: tags.bool, class: 'cm-bool' },
  { tag: tags.regexp, class: 'cm-regexp' },
  { tag: tags.escape, class: 'cm-escape' },
  { tag: tags.color, class: 'cm-color' },
  { tag: tags.url, class: 'cm-url' },
  { tag: tags.keyword, class: 'cm-keyword' },
  { tag: tags.self, class: 'cm-self' },
  { tag: tags.null, class: 'cm-null' },
  { tag: tags.atom, class: 'cm-atom' },
  { tag: tags.unit, class: 'cm-unit' },
  { tag: tags.modifier, class: 'cm-modifier' },
  { tag: tags.operatorKeyword, class: 'cm-operator-keyword' },
  { tag: tags.controlKeyword, class: 'cm-control-keyword' },
  { tag: tags.definitionKeyword, class: 'cm-definition-keyword' },
  { tag: tags.moduleKeyword, class: 'cm-module-keyword' },
  { tag: tags.operator, class: 'cm-operator' },
  { tag: tags.derefOperator, class: 'cm-deref-operator' },
  { tag: tags.arithmeticOperator, class: 'cm-arithmetic-operator' },
  { tag: tags.logicOperator, class: 'cm-logic-operator' },
  { tag: tags.bitwiseOperator, class: 'cm-bitwise-operator' },
  { tag: tags.compareOperator, class: 'cm-compare-operator' },
  { tag: tags.updateOperator, class: 'cm-update-operator' },
  { tag: tags.definitionOperator, class: 'cm-definition-operator' },
  { tag: tags.typeOperator, class: 'cm-type-operator' },
  { tag: tags.controlOperator, class: 'cm-control-operator' },
  { tag: tags.punctuation, class: 'cm-punctuation' },
  { tag: tags.separator, class: 'cm-separator' },
  { tag: tags.bracket, class: 'cm-bracket' },
  { tag: tags.angleBracket, class: 'cm-angle-bracket' },
  { tag: tags.squareBracket, class: 'cm-square-bracket' },
  { tag: tags.paren, class: 'cm-paren' },
  { tag: tags.brace, class: 'cm-brace' },
  { tag: tags.content, class: 'cm-content-span' }, // BEWARE to NOT name that ".cm-content"
  { tag: tags.link, class: 'cm-link' },
  { tag: tags.monospace, class: 'cm-monospace' },
  { tag: tags.strikethrough, class: 'cm-strikethrough' },
  { tag: tags.inserted, class: 'cm-inserted' },
  { tag: tags.deleted, class: 'cm-deleted' },
  { tag: tags.changed, class: 'cm-changed' },
  { tag: tags.invalid, class: 'cm-invalid' },
  { tag: tags.meta, class: 'cm-meta' }
])

export function markdownSyntaxHighlighter (): Extension {
  return [ syntaxHighlighting(markdownTheme), syntaxHighlighting(codeTheme) ]
}

export function codeSyntaxHighlighter (): Extension {
  return syntaxHighlighting(codeTheme)
}
