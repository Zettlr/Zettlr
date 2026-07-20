/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Bidi isolate node props
 * CVM-Role:        Lezer Node Props
 * Maintainer:      Writer fork
 * License:         GNU GPL v3
 *
 * Description:     Marks inline Markdown syntax nodes as bidirectional
 *                  isolates, so that the bidiIsolates() extension (see
 *                  writer/bidi.ts) renders them as coherent units inside
 *                  runs of opposite-direction text: URLs stay left-to-right,
 *                  emphasis marks stick to their content, link brackets and
 *                  parentheses appear on the correct sides.
 *
 *                  NOTE: This file must stay importable from the main process
 *                  (the FSAL file parser loads the Markdown parser, too), so
 *                  it must not import from @codemirror/view.
 *
 * END HEADER
 */

import { NodeProp, type NodePropSource } from '@lezer/common'

/**
 * Isolate directions per node type. 'auto' resolves from the node's first
 * strong character; 'ltr' pins the node (used for content that is virtually
 * always Latin, such as URLs and citekeys).
 */
export const bidiIsolateProps: NodePropSource = NodeProp.isolate.add({
  // Nodes from @lezer/markdown
  URL: 'ltr',
  Autolink: 'ltr',
  InlineCode: 'auto', // Also covers Zettlr's inline math (math-parser reuses the node)
  Link: 'auto',
  Image: 'auto',
  Emphasis: 'auto',
  StrongEmphasis: 'auto',
  HTMLTag: 'ltr',
  // Custom Zettlr nodes
  ZknLink: 'auto',
  ZknTag: 'auto',
  Citation: 'ltr'
})
