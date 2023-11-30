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

export const customTags = {
  YAMLFrontmatterStart: Tag.define(tags.contentSeparator),
  YAMLFrontmatterEnd: Tag.define(tags.contentSeparator),
  YAMLFrontmatterKey: Tag.define(tags.tagName),
  YAMLFrontmatterString: Tag.define(tags.string),
  YAMLFrontmatterBoolean: Tag.define(tags.bool),
  YAMLFrontmatterNumber: Tag.define(tags.number),
  YAMLFrontmatterPlain: Tag.define(),
  // Meta-tags only used to contain the actual values
  YAMLFrontmatterPair: Tag.define(),
  YAMLFrontmatterSeq: Tag.define(),
  YAMLFrontmatterMap: Tag.define(),
  Citation: Tag.define(),
  Footnote: Tag.define(),
  FootnoteRef: Tag.define(),
  FootnoteRefLabel: Tag.define(),
  FootnoteRefBody: Tag.define(),
  // Zettelkasten links
  ZknLink: Tag.define(),
  ZknLinkContent: Tag.define(),
  // Zettelkasten tags
  ZknTag: Tag.define(),
  ZknTagContent: Tag.define(),
  // Pandoc attributes, like: `# Heading or Title {.unnumbered}`
  PandocAttribute: Tag.define(),
  Highlight: Tag.define(),
  HighlightContent: Tag.define()
}
