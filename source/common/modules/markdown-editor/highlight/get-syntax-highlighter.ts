import { tags } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { customTags } from '../util/custom-tags'

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
  { tag: customTags.YAMLFrontmatterStart, class: 'yaml-frontmatter start' },
  { tag: customTags.YAMLFrontmatterEnd, class: 'yaml-frontmatter end' },
  { tag: customTags.YAMLFrontmatterKey, class: 'yaml-frontmatter key' },
  { tag: customTags.YAMLFrontmatterString, class: 'yaml-frontmatter string' },
  { tag: customTags.YAMLFrontmatterBoolean, class: 'yaml-frontmatter boolean' },
  { tag: customTags.YAMLFrontmatterNumber, class: 'yaml-frontmatter number' },
  { tag: customTags.YAMLFrontmatterPlain, class: 'yaml-frontmatter plain' },
  { tag: customTags.YAMLFrontmatterSeq, class: 'yaml-frontmatter seq' },
  { tag: customTags.YAMLFrontmatterMap, class: 'yaml-frontmatter map' },
  { tag: customTags.YAMLFrontmatterPair, class: 'yaml-frontmatter pair' },
  // Codeblocks
  { tag: tags.labelName, class: 'cm-info-string' }, // CodeInfo (info string)
  { tag: tags.processingInstruction, class: 'cm-code-mark' }, // CodeMark (i.e. ```) but also (pipe) table delimiters
  { tag: tags.monospace, class: 'cm-monospace' }, // CodeText (i.e. code block content)
  // Tables TODO
  // Footnotes
  { tag: customTags.Footnote, class: 'footnote' },
  { tag: customTags.FootnoteRef, class: 'footnote-ref' },
  { tag: customTags.FootnoteBody, class: 'footnote-body' }
])

const codeTheme = HighlightStyle.define([
  { tag: tags.comment, class: 'comment' },
  { tag: tags.lineComment, class: 'line-comment' },
  { tag: tags.blockComment, class: 'block-comment' },
  { tag: tags.docComment, class: 'doc-comment' },
  { tag: tags.name, class: 'name' },
  { tag: tags.variableName, class: 'variable-name' },
  { tag: tags.typeName, class: 'type-name' },
  { tag: tags.tagName, class: 'tag-name' },
  { tag: tags.propertyName, class: 'property-name' },
  { tag: tags.attributeName, class: 'attribute-name' },
  { tag: tags.className, class: 'class-name' },
  { tag: tags.labelName, class: 'label-name' },
  { tag: tags.namespace, class: 'namespace' },
  { tag: tags.macroName, class: 'macro-name' },
  { tag: tags.literal, class: 'literal' },
  { tag: tags.string, class: 'string' },
  { tag: tags.docString, class: 'doc-string' },
  { tag: tags.character, class: 'character' },
  { tag: tags.attributeValue, class: 'attribute-value' },
  { tag: tags.number, class: 'number' },
  { tag: tags.integer, class: 'integer' },
  { tag: tags.float, class: 'float' },
  { tag: tags.bool, class: 'bool' },
  { tag: tags.regexp, class: 'regexp' },
  { tag: tags.escape, class: 'escape' },
  { tag: tags.color, class: 'color' },
  { tag: tags.url, class: 'url' },
  { tag: tags.keyword, class: 'keyword' },
  { tag: tags.self, class: 'self' },
  { tag: tags.null, class: 'null' },
  { tag: tags.atom, class: 'atom' },
  { tag: tags.unit, class: 'unit' },
  { tag: tags.modifier, class: 'modifier' },
  { tag: tags.operatorKeyword, class: 'operator-keyword' },
  { tag: tags.controlKeyword, class: 'control-keyword' },
  { tag: tags.definitionKeyword, class: 'definition-keyword' },
  { tag: tags.moduleKeyword, class: 'module-keyword' },
  { tag: tags.operator, class: 'operator' },
  { tag: tags.derefOperator, class: 'deref-operator' },
  { tag: tags.arithmeticOperator, class: 'arithmetic-operator' },
  { tag: tags.logicOperator, class: 'logic-operator' },
  { tag: tags.bitwiseOperator, class: 'bitwise-operator' },
  { tag: tags.compareOperator, class: 'compare-operator' },
  { tag: tags.updateOperator, class: 'update-operator' },
  { tag: tags.definitionOperator, class: 'definition-operator' },
  { tag: tags.typeOperator, class: 'type-operator' },
  { tag: tags.controlOperator, class: 'control-operator' },
  { tag: tags.punctuation, class: 'punctuation' },
  { tag: tags.separator, class: 'separator' },
  { tag: tags.bracket, class: 'bracket' },
  { tag: tags.angleBracket, class: 'angle-bracket' },
  { tag: tags.squareBracket, class: 'square-bracket' },
  { tag: tags.paren, class: 'paren' },
  { tag: tags.brace, class: 'brace' },
  { tag: tags.content, class: 'content' },
  { tag: tags.link, class: 'link' },
  { tag: tags.monospace, class: 'monospace' },
  { tag: tags.strikethrough, class: 'strikethrough' },
  { tag: tags.inserted, class: 'inserted' },
  { tag: tags.deleted, class: 'deleted' },
  { tag: tags.changed, class: 'changed' },
  { tag: tags.invalid, class: 'invalid' },
  { tag: tags.meta, class: 'meta' }
])

export function markdownSyntaxHighlighter () {
  return [syntaxHighlighting(markdownTheme), syntaxHighlighting(codeTheme)]
}

export function codeSyntaxHighlighter () {
  return syntaxHighlighting(codeTheme)
}
