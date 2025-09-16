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
  // Meta-tags only used to contain the actual values
  YAMLFrontmatterPair: Tag.define(),
  YAMLFrontmatterSeq: Tag.define(),
  YAMLFrontmatterMap: Tag.define(),
  Citation: Tag.define(),
  CitationMark: Tag.define(tags.processingInstruction),
  CitationPrefix: Tag.define(),
  CitationSuppressAuthorFlag: Tag.define(tags.processingInstruction),
  CitationAtSign: Tag.define(tags.processingInstruction),
  CitationCitekey: Tag.define(),
  CitationLocator: Tag.define(),
  CitationSuffix: Tag.define(),
  Footnote: Tag.define(),
  FootnoteRef: Tag.define(),
  FootnoteRefLabel: Tag.define(),
  FootnoteRefBody: Tag.define(),
  // Zettelkasten links
  ZknLink: Tag.define(),
  ZknLinkContent: Tag.define(),
  ZknLinkTitle: Tag.define(),
  ZknLinkPipe: Tag.define(tags.processingInstruction),
  // Zettelkasten tags
  ZknTag: Tag.define(),
  ZknTagContent: Tag.define(),
  // Pandoc attributes, like: `# Heading or Title {.unnumbered}`
  PandocAttribute: Tag.define(),
  HighlightMark: Tag.define(),
  HighlightContent: Tag.define()
}
