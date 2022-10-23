import { Tag, tags } from '@lezer/highlight'

// This file defines custom tags to be used by our custom implementation. They
// must be defined here because they need to be accessed both by the language
// parser (to declare the tags that the frontmatter parser will spit out) as
// well as the highlighter so that that one can attach styling to them.
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
  FootnoteBody: Tag.define(),
  // Zettelkasten links
  ZknLink: Tag.define(),
  ZknLinkContent: Tag.define()
}
