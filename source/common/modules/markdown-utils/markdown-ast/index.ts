/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseNode
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a converter that can take in a Markdown
 *                  source string and convert it to an Abstract Syntax Tree.
 *                  This file follows the advice of Marijn Haverbeke, who
 *                  mentioned that Lezer trees are not necessarily "abstract"
 *                  and hence need to be converted prior to utilizing the tree:
 *
 *                  "These trees, represented by data structures from the
 *                  @lezer/common package, are more limited than the abstract
 *                  syntax trees you might have seen in other contexts. They are
 *                  not very abstract."
 *                  (from: https://lezer.codemirror.net/docs/guide/)
 *
 *                  The utility function runs the Markdown parser as defined for
 *                  the main editor to ensure that every element that the user
 *                  can see in the editor will also end up represented here. The
 *                  syntax tree is primarily used in two different instances
 *                  across the app:
 *
 *                  1. To extract only the text nodes (Readability Mode & spell
 *                     checking)
 *                  2. To "copy as HTML" (see markdown-to-html)
 *
 * END HEADER
 */

import { type SyntaxNode } from '@lezer/common'
import { parseTableNode } from './parse-table-node'
import { getWhitespaceBeforeNode } from './get-whitespace-before-node'
import { genericTextNode } from './generic-text-node'
import { parseChildren } from './parse-children'
import { nodeToCiteItem, type Citation } from '../../markdown-editor/parser/citation-parser'

/**
 * Basic info every ASTNode needs to provide
 */
export interface MDNode {
  /**
   * The node.name property (may differ from the type; significant mainly for
   * generics)
   */
  name: string
  /**
   * The start offset of this node in the original source
   */
  from: number
  /**
   * The end offset of this node in the original source
   */
  to: number
  /**
   * This property contains the whitespace before this node; required to
   * determine appropriate significant whitespace portions for some elements
   * upon converting to HTML.
   */
  whitespaceBefore: string
  /**
   * Can be used to store arbitrary attributes (e.g. Pandoc-style attributes
   * such as {.className})
   */
  attributes: Record<string, string|string[]>
}

/**
 * Represents a footnote (the indicator within the text itself, not the
 * reference).
 */
export interface Footnote extends MDNode {
  type: 'Footnote'
  /**
   * If this is true, this means that the label is actually the footnote's
   * context, whereas label will be the footnote ref number if its false.
   */
  inline: boolean
  /**
   * The label of the footnote (sans the formatting, i.e. [^1] -> 1)
   */
  label: string
}

/**
 * A footnote reference, complete with label and footnote body.
 */
export interface FootnoteRef extends MDNode {
  type: 'FootnoteRef'
  /**
   * The label of the footnote (sans the formatting, i.e. [^1]: -> 1)
   */
  label: string
  /**
   * A list of children representing the footnote's body
   */
  children: ASTNode[]
}

/**
 * Either a link or an image, since the difference between these two nodes
 * consists of a single character.
 */
export interface LinkOrImage extends MDNode {
  type: 'Link'|'Image'
  /**
   * The URL of the link or image
   */
  url: string
  /**
   * ALT text of the link or image (i.e. what's written in square brackets)
   */
  alt: TextNode
  /**
   * Optional title text (i.e. what can be added after the URL in quotes)
   */
  title?: TextNode
}

/**
 * Represents a Heading.
 */
export interface Heading extends MDNode {
  type: 'Heading'
  /**
   * The content of the heading, but as a plain string
   */
  content: string
  /**
   * The heading's content
   */
  children: ASTNode[]
  /**
   * Level from 1-6
   */
  level: number
}

/**
 * A citation element
 */
export interface CitationNode extends MDNode {
  type: 'Citation'
  /**
   * The unparsed, raw citation code
   */
  value: string
  /**
   * The parsed citation code that can be used to render the citation
   */
  parsedCitation: Citation
}

/**
 * A highlight, e.g., encapsulated ==in equality signs==
 */
export interface Highlight extends MDNode {
  type: 'Highlight'
  /**
   * Since it's a regular inline element, it can have children
   */
  children: ASTNode[]
}

export interface Superscript extends MDNode {
  type: 'Superscript'
  children: ASTNode[]
}

export interface Subscript extends MDNode {
  type: 'Subscript'
  children: ASTNode[]
}

/**
 * A single list item.
 */
export interface ListItem extends MDNode {
  type: 'ListItem'
  /**
   * An optional property. If it exists, it is a task item, and the property
   * indicates whether it is checked or not.
   */
  checked?: boolean
  /**
   * An optional property. It is set on ordered list items and indicates the
   * number that was used for this item in the Markdown source. Should be
   * ignored by converters that transform the list into HTML.
   */
  number?: number
  /**
   * A property that includes information about the list item marker.
   */
  marker: {
    /**
     * The start of the list marker.
     */
    from: number
    /**
     * The end of the list marker.
     */
    to: number
  }
  /**
   * A list item can contain an arbitrary amount of child nodes. Adding "List"
   * as an explicit child to signify that nested lists are children of an item.
   */
  children: Array<OrderedList|BulletList|ASTNode>
}

/**
 * Represents an ordered list.
 */
export interface OrderedList extends MDNode {
  type: 'OrderedList'
  /**
   * At what number the list starts (default: 1)
   */
  startsAt: number
  /**
   * Identifies this as a task list, if applicable
   */
  isTaskList: boolean
  /**
   * The delimiter used by this list, can be either ) or .
   */
  delimiter: ')'|'.'
  /**
   * Whether this list is loose (in that case, HTML output should wrap the list
   * item's contents in paragraphs)
   */
  loose: boolean
  /**
   * A set of list items
   */
  items: ListItem[]
}

export interface BulletList extends MDNode {
  type: 'BulletList'
  /**
   * Identifies this as a task list, if applicable
   */
  isTaskList: boolean
  /**
   * The symbol this list uses
   */
  symbol: '*'|'-'|'+'
  /**
   * Whether this list is loose (in that case, HTML output should wrap the list
   * item's contents in paragraphs)
   */
  loose: boolean
  /**
   * A set of list items
   */
  items: ListItem[]
}

/**
 * Represents a fenced code. NOTE that CodeBlocks are also treated as FencedCode.
 */
export interface FencedCode extends MDNode {
  type: 'FencedCode'
  /**
   * The info string (can be an empty string, e.g., for indented code)
   */
  info: string
  /**
   * The verbatim source code. (Not represented as a TextNode since whitespace
   * is significant and it shouldn't count towards word counts, etc.)
   */
  source: string
}

/**
 * Represents inline code.
 */
export interface InlineCode extends MDNode {
  type: 'InlineCode'

  /**
   * This is similar to FencedCode, in that it will be an empty string for
   * inline code, except it is an inline MathTeX equation, in which case the
   * info string will contain the code mark (either $ for inline, or $$ for
   * display).
   */
  info: string
  /**
   * The verbatim source code. (Not represented as a TextNode since whitespace
   * is significant and it shouldn't count towards word counts, etc.)
   */
  source: string
}

/**
 * An emphasis node (italic or bold).
 */
export interface Emphasis extends MDNode {
  type: 'Emphasis'
  /**
   * The type of emphasis -- italic or bold
   */
  which: 'italic'|'bold'
  /**
   * The children of this node
   */
  children: ASTNode[]
}

/**
 * This node represents a YAML frontmatter. It shares a lot with the FencedCode
 * type, i.e. the YAML code will not be parsed into an object.
 */
export interface YAMLFrontmatter extends MDNode {
  type: 'YAMLFrontmatter'
  /**
   * The verbatim YAML source.
   */
  source: string
}

/**
 * Represents a single table cell
 */
export interface TableCell extends MDNode {
  type: 'TableCell'
  /**
   * The cell's content
   */
  children: ASTNode[]
  /**
   * Contains the raw cell contents as a string
   */
  textContent: string
  /**
   * This property contains the "actual" from and to positions of the cell (not
   * just the actual content, but including the whitespace) just up to the cell
   * delimiter.
   */
  padding: {
    from: number
    to: number
  }
}

/**
 * Represents a table row.
 */
export interface TableRow extends MDNode {
  type: 'TableRow'
  /**
   * This is set to true if the row is a header.
   */
  isHeaderOrFooter: boolean
  /**
   * A list of cells within this row
   */
  cells: TableCell[]
}

/**
 * Represents a table element.
 */
export interface Table extends MDNode {
  type: 'Table'
  /**
   * A list of rows of this table
   */
  rows: TableRow[]
  /**
   * A list of column alignments in the table.
   */
  alignment: Array<'left'|'center'|'right'|null>
  /**
   * This property contains the table type in the source.
   */
  tableType: 'grid'|'pipe'
}

/**
 * Represents a ZettelkastenLink (`[[Some file.md]]`)
 */
export interface ZettelkastenLink extends MDNode {
  type: 'ZettelkastenLink'
  /**
   * Contains the actual target of the link (accounting for optional titles)
   */
  target: string
  /**
   * The from:to positions of the actual target range. This can be useful to
   * access just the title range (e.g., for replacing).
   */
  targetRange: { from: number, to: number }
  /**
   * The link title; undefined if the link does not include a title.
   */
  title?: TextNode
}

/**
 * Represents a tag (`#some-tag`)
 */
export interface ZettelkastenTag extends MDNode {
  type: 'ZettelkastenTag'
  /**
   * Contains the raw contents of the tag
   */
  value: string
}

export interface Comment extends MDNode {
  type: 'Comment'
  /**
   * Contains the raw contents of the comment
   */
  value: string
}

/**
 * A generic text node that can represent a string of content. Most nodes
 * contain at least one TextNode as its content (e.g. emphasis).
 */
export interface TextNode extends MDNode {
  type: 'Text'
  /**
   * The string value of the text node.
   */
  value: string
}

/**
 * This generic node represents any Lezer node that has no specific role (or can
 * be handled without additional care). This ensures that new nodes will always
 * end up in the resulting AST, even if we forgot to add the node specifically.
 */
export interface GenericNode extends MDNode {
  type: 'Generic'
  /**
   * Each generic node may have children
   */
  children: ASTNode[]
}

/**
 * Any node that can be part of the AST is an ASTNode.
 */
export type ASTNode = Comment | Footnote | FootnoteRef | LinkOrImage | TextNode
| Heading | CitationNode | Highlight | Superscript | Subscript | OrderedList
| BulletList | ListItem | GenericNode | FencedCode | InlineCode | YAMLFrontmatter
| Emphasis | Table | TableCell | TableRow | ZettelkastenLink | ZettelkastenTag
/**
 * Extract the "type" properties from the ASTNodes that can differentiate these.
 */
export type ASTNodeType = ASTNode['type']

/**
 * Parses a single Lezer style SyntaxNode to an ASTNode.
 *
 * @param   {SyntaxNode}  node      The node to convert
 * @param   {string}      markdown  The Markdown source, required to extract the
 *                                  actual text content of the SyntaxNodes,
 *                                  which isn't stored in the nodes themselves.
 *
 * @return  {ASTNode}               The root node of a Markdown AST
 */
export function parseNode (node: SyntaxNode, markdown: string): ASTNode {
  switch (node.name) {
    // NOTE: Most nodes are treated as generics (see default case); here we only
    // define nodes which we can "compress" a little bit or make accessible
    case 'Image':
    case 'Link': {
      const alt = node.getChild('LinkLabel')
      const url = node.getChild('URL')
      if (url === null) {
        return {
          type: 'Generic',
          name: node.name,
          attributes: {},
          from: node.from,
          to: node.to,
          whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
          children: [genericTextNode(node.from, node.to, markdown.substring(node.from, node.to))]
        }
      }

      const astNode: LinkOrImage = {
        type: node.name,
        name: node.name,
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        // title: genericTextNode(node.from, node.to, markdown.substring(node.from, node.to)), TODO
        url: markdown.substring(url.from, url.to),
        alt: alt !== null
          ? genericTextNode(alt.from, alt.to, markdown.substring(alt.from, alt.to))
          : genericTextNode(url.from, url.to, markdown.substring(url.from, url.to))
      }

      const marks = node.getChildren('LinkMark')

      if (alt === null && marks.length >= 2) {
        // The default Markdown parser doesn't apply "LinkLabel" unfortunately.
        // So instead we have to get whatever is in between the first and second
        // linkMark.
        astNode.alt = genericTextNode(marks[0].to, marks[1].from, markdown.substring(marks[0].to, marks[1].from))
      } // Else: Somewhat malformed link.

      return astNode
    }
    case 'URL': {
      let url = markdown.substring(node.from, node.to)
      if (url.startsWith('<') && url.endsWith('>')) {
        url = url.slice(1, url.length - 1)
      }

      const astNode: LinkOrImage = {
        type: 'Link',
        attributes: {},
        name: node.name,
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        url,
        alt: genericTextNode(node.from, node.to, url)
      }
      return astNode
    }
    case 'ATXHeading1':
    case 'ATXHeading2':
    case 'ATXHeading3':
    case 'ATXHeading4':
    case 'ATXHeading5':
    case 'ATXHeading6': {
      const mark = node.getChild('HeaderMark')
      const level = mark !== null ? mark.to - mark.from : 0
      const astNode: Heading = {
        type: 'Heading',
        attributes: {},
        name: node.name,
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        content: markdown.slice(mark?.to ?? node.from, node.to).trim(),
        children: [],
        level
      }
      return parseChildren(astNode, node, markdown)
    }
    case 'SetextHeading1':
    case 'SetextHeading2': {
      const mark = node.getChild('HeaderMark')
      const level = mark !== null && markdown.substring(mark.from, mark.to).includes('-') ? 2 : 1
      const astNode: Heading = {
        type: 'Heading',
        attributes: {},
        name: node.name,
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        content: markdown.slice(node.from, mark?.from ?? node.to),
        children: [],
        level
      }
      return parseChildren(astNode, node, markdown)
    }
    case 'Citation': {
      const astNode: CitationNode = {
        name: 'Citation',
        type: 'Citation',
        attributes: {},
        value: markdown.substring(node.from, node.to),
        parsedCitation: nodeToCiteItem(node, markdown),
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown)
      }
      return astNode
    }
    case 'Footnote': {
      const contents = markdown.substring(node.from + 2, node.to - 1) // [^1] --> 1
      const astNode: Footnote = {
        type: 'Footnote',
        name: 'Footnote',
        attributes: {},
        from: node.from,
        inline: contents.endsWith('^'),
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        label: contents.endsWith('^') ? contents.substring(0, contents.length - 1) : contents
      }
      return astNode
    }
    case 'FootnoteRef': {
      const label = node.getChild('FootnoteRefLabel')
      const body = node.getChild('FootnoteRefBody')
      const astNode: FootnoteRef = {
        type: 'FootnoteRef',
        name: 'FootnoteRef',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        label: label !== null ? markdown.substring(label.from + 2, label.to - 2) : '',
        children: []
      }

      if (body !== null) {
        return parseChildren(astNode, body, markdown)
      } else {
        return astNode
      }
    }
    case 'HighlightContent': {
      const astNode: Highlight = {
        type: 'Highlight',
        name: 'Highlight',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        children: []
      }
      return parseChildren(astNode, node, markdown)
    }
    case 'OrderedList': {
      const astNode: OrderedList = {
        type: 'OrderedList',
        attributes: {},
        startsAt: 0,
        isTaskList: false,
        delimiter: '.',
        loose: false, // TODO
        name: node.name,
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        items: []
      }

      for (const item of node.getChildren('ListItem')) {
        const listItem: ListItem = {
          type: 'ListItem',
          name: 'ListItem',
          attributes: {},
          from: item.from,
          to: item.to,
          whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
          children: [],
          marker: { from: item.from, to: item.from }
        }

        const listMark = item.getChild('ListMark')
        if (listMark !== null) {
          listItem.marker.from = listMark.from
          listItem.marker.to = listMark.to

          const number = parseInt(markdown.substring(listMark.from, listMark.to - 1), 10)
          const delim = markdown.substring(listMark.to - 1, listMark.to)
          listItem.number = number
          if (astNode.startsAt < 1) {
            astNode.startsAt = number
            if (delim === ')' || delim === '.') {
              astNode.delimiter = delim
            }
          }
        }

        // Identify potential task item
        const task = item.getChild('Task')
        const taskMarker = task !== null ? task.getChild('TaskMarker') : null
        if (taskMarker !== null) {
          astNode.isTaskList = true
          const text = markdown.substring(taskMarker.from, taskMarker.to)
          listItem.checked = text === '[x]'
        }

        // In addition, the MarkdownParser wraps the entire task list item into
        // a "Task" node. We can't skip it automagically because there is no
        // mechanism for it (TODO), but we can manually pry it out of the tree
        // here. We first need to parse the node's children here.
        parseChildren(listItem, item, markdown)
        const taskNode = listItem.children.find(child => child.type === 'Generic' && child.name === 'Task')
        if (taskNode !== undefined && taskNode.type === 'Generic') {
          const idx = listItem.children.indexOf(taskNode)
          listItem.children.splice(idx, 1, ...taskNode.children)
        }

        astNode.items.push(listItem)
      }

      return astNode
    }
    case 'BulletList': {
      const astNode: BulletList = {
        type: 'BulletList',
        attributes: {},
        isTaskList: false,
        symbol: '-',
        loose: false, // TODO
        name: node.name,
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        items: []
      }

      for (const item of node.getChildren('ListItem')) {
        const listItem: ListItem = {
          type: 'ListItem',
          name: 'ListItem',
          attributes: {},
          from: item.from,
          to: item.to,
          whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
          children: [],
          marker: { from: item.from, to: item.from }
        }

        const listMark = item.getChild('ListMark')
        if (listMark !== null) {
          listItem.marker.from = listMark.from
          listItem.marker.to = listMark.to

          const symbol = markdown.substring(listMark.from, listMark.to)
          if (symbol === '-' || symbol === '+' || symbol === '*') {
            astNode.symbol = symbol
          }
        }

        // Identify potential task item
        const task = item.getChild('Task')
        const taskMarker = task !== null ? task.getChild('TaskMarker') : null
        if (taskMarker !== null) {
          astNode.isTaskList = true
          const text = markdown.substring(taskMarker.from, taskMarker.to)
          listItem.checked = text === '[x]'
        }

        // In addition, the MarkdownParser wraps the entire task list item into
        // a "Task" node. We can't skip it automagically because there is no
        // mechanism for it (TODO), but we can manually pry it out of the tree
        // here. We first need to parse the node's children here.
        parseChildren(listItem, item, markdown)
        const taskNode = listItem.children.find(child => child.type === 'Generic' && child.name === 'Task')
        if (taskNode !== undefined && taskNode.type === 'Generic') {
          const idx = listItem.children.indexOf(taskNode)
          listItem.children.splice(idx, 1, ...taskNode.children)
        }

        astNode.items.push(listItem)
      }

      return astNode
    }
    case 'FencedCode':
    case 'CodeBlock': {
      let info = node.getChild('CodeInfo')
      const mark = node.getChild('CodeMark')
      if (mark !== null) {
        const codeMark = markdown.substring(mark.from, mark.to)
        if (codeMark === '$$') {
          // Exchange the (nonexistent) infostring with the double-dollars so
          // that consumers can detect that this is MathTex
          info = mark
        }
      }
      const source = node.getChild('CodeText')
      const astNode: FencedCode = {
        type: 'FencedCode',
        name: 'FencedCode',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        info: info !== null ? markdown.substring(info.from, info.to) : '',
        source: source !== null ? markdown.substring(source.from, source.to) : ''
      }
      return astNode
    }
    case 'YAMLFrontmatter': {
      const source = node.getChild('CodeText')
      const astNode: YAMLFrontmatter = {
        type: 'YAMLFrontmatter',
        name: 'YAMLFrontmatter',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        source: source !== null ? markdown.substring(source.from, source.to) : ''
      }
      return astNode
    }
    case 'InlineCode': {
      const [ start, end ] = node.getChildren('CodeMark')
      let info = ''
      const codeMark = markdown.substring(start.from, start.to)
      if (codeMark === '$$' || codeMark === '$') {
        info = codeMark
      }

      const astNode: InlineCode = {
        type: 'InlineCode',
        name: 'InlineCode',
        attributes: {},
        from: node.from,
        to: node.to,
        info,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        source: markdown.substring(start.to, end.from)
      }
      return astNode
    }
    case 'Comment':
    case 'CommentBlock': {
      const astNode: Comment = {
        type: 'Comment',
        attributes: {},
        name: node.name,
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        value: markdown.slice(node.from + 4, node.to - 3).trim() // <!-- and -->
      }
      return astNode
    }
    case 'Emphasis':
    case 'StrongEmphasis': {
      const astNode: Emphasis = {
        type: 'Emphasis',
        name: 'Emphasis',
        attributes: {},
        which: node.name === 'Emphasis' ? 'italic' : 'bold',
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        children: []
      }

      return parseChildren(astNode, node, markdown)
    }
    case 'Superscript': {
      const astNode: Superscript = {
        type: 'Superscript',
        name: 'Superscript',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        children: []
      }

      return parseChildren(astNode, node, markdown)
    }
    case 'Subscript': {
      const astNode: Subscript = {
        type: 'Subscript',
        name: 'Subscript',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        children: []
      }

      return parseChildren(astNode, node, markdown)
    }
    case 'Table':
      // Tables are somewhat cumbersome to convert, so we outsource it to its own function
      return parseTableNode(node, markdown)
    case 'ZknLink': {
      const content = node.getChild('ZknLinkContent')
      if (content === null) {
        throw new Error('Could not parse node ZknLink: No ZknLinkContent node found within children!')
      }
      const title = node.getChild('ZknLinkTitle')
      const astNode: ZettelkastenLink = {
        type: 'ZettelkastenLink',
        name: 'ZknLink',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        target: markdown.substring(content.from, content.to),
        targetRange: { from: content.from, to: content.to },
        title: undefined
      }

      if (title !== null) {
        astNode.title = genericTextNode(title.from, title.to, markdown.substring(title.from, title.to))
      }

      return astNode
    }
    case 'ZknTag': {
      const astNode: ZettelkastenTag = {
        type: 'ZettelkastenTag',
        name: 'ZknTag',
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        value: markdown.substring(node.from + 1, node.to)
      }
      return astNode
    }
    default: {
      const astNode: GenericNode = {
        type: 'Generic',
        name: node.name,
        attributes: {},
        from: node.from,
        to: node.to,
        whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
        children: []
      }
      return parseChildren(astNode, node, markdown)
    }
  }
}
