/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Custom Tags
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module defines custom tags that our custom parsers add
 *                  to the Lezer Trees emitted by the Markdown mode. These tags
 *                  are provided both to the Markdown parser as well as the
 *                  highlighter mode so they know about them.
 *
 * END HEADER
 */

import { Tag, tags } from '@lezer/highlight'

// NOTE: Changes here must be reflected in theme/syntax.ts and parser/markdown-parser.ts
export const customTags = {
  YAMLFrontmatter: Tag.define(tags.monospace),
  YAMLFrontmatterStart: Tag.define(tags.contentSeparator),
  YAMLFrontmatterEnd: Tag.define(tags.contentSeparator),
  // Citations: @citations
  Citation: Tag.define(),
  CitationMark: Tag.define(tags.processingInstruction),
  CitationPrefix: Tag.define(),
  CitationSuppressAuthorFlag: Tag.define(tags.processingInstruction),
  CitationAtSign: Tag.define(tags.processingInstruction),
  CitationCitekey: Tag.define(),
  CitationLocator: Tag.define(),
  CitationSuffix: Tag.define(),
  // Footnotes: `[^1] ... [^1]: note`
  Footnote: Tag.define(),
  FootnoteRef: Tag.define(),
  FootnoteRefLabel: Tag.define(),
  // Zettelkasten links: [[link|title]]
  ZknLink: Tag.define(),
  ZknLinkMark: Tag.define(),
  ZknLinkContent: Tag.define(),
  ZknLinkTitle: Tag.define(),
  ZknLinkPipe: Tag.define(tags.processingInstruction),
  // Zettelkasten tags: #my-tag
  ZknTag: Tag.define(),
  ZknTagMark: Tag.define(),
  // Pandoc attributes: `# Heading or Title {.unnumbered}`
  PandocAttribute: Tag.define(),
  PandocAttributeMark: Tag.define(),
  // Pandoc divs: `::: class {#id}`
  PandocDiv: Tag.define(),
  PandocDivInfo: Tag.define(),
  PandocDivMark: Tag.define(),
  // Pandoc spans: `[content]{.mark}`
  PandocSpan: Tag.define(),
  PandocSpanMark: Tag.define(),
  // Highlight marks: `==content==`
  HighlightMark: Tag.define(),
  HighlightContent: Tag.define(),
  // Pipe tabls
  Table: Tag.define(),
  TableHeader: Tag.define(),
  TableDelimiter: Tag.define(),
  TableRow: Tag.define(),
  TableCell: Tag.define(),
}
