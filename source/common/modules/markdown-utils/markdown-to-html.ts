/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        md2html
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a Markdown to HTML converter that will
 *                  take in a Markdown source string and convert it to HTML. It
 *                  uses the MainEditor's Markdown parser instance to ensure
 *                  that every element that the editor recognizes is being
 *                  appropriately converted into HTML tags. Any Markdown element
 *                  that comes from the Lezer tree and is not dedicatedly
 *                  handled (read: It has type 'Generic') the formatter will
 *                  create a Span or DIV element (depending on how many children
 *                  the generic has) and supply the node name (from the Lezer
 *                  tree) as a classname, converting the CamelCase to kebab-case.
 *
 * END HEADER
 */

import { extractASTNodes, markdownToAST } from '.'
import { type CitationNode, type ASTNode, type GenericNode, type FootnoteRef } from './markdown-ast'
import { type MarkdownParserConfig } from '../markdown-editor/parser/markdown-parser'
import _ from 'underscore'
import { katexToHTML } from '@common/util/mathtex-to-html'

/**
 * Represents an HTML tag. This is a purposefully shallow representation
 */
interface HTMLTag {
  /**
   * The tag name for the resulting HTML tag
   */
  tagName: string
  /**
   * Self closing are, e.g., <hr>
   */
  selfClosing: boolean
  /**
   * A simple map of attributes (e.g., ['class', 'my-class'])
   */
  attributes: Array<[ string, string ]>
}

export type CitationCallback = (citations: CiteItem[], composite: boolean) => string|undefined

export interface MD2HTMLOptions {
  /**
   * The link format used in the Markdown source
   */
  zknLinkFormat: 'link|title'|'title|link' // = 'link|title'
  /**
   * An optional section heading for the reference section. Will only be used if
   * there is a bibliography to render.
   */
  referenceSectionTitle?: string
  /**
   * This is called whenever the parser finds a citation.
   *
   * @param   {CiteItem[]}  citations  The citations from the Markdown source
   * @param   {boolean}     composite  Whether this is a composite citation
   *
   * @return  {[]}                     Should return the citation, or undefined.
   */
  onCitation: (citations: CiteItem[], composite: boolean) => string|undefined
  /**
   * If provided, this callback will be called after the Markdown-to-HTML
   * conversion is finished to generate a bibliography. The callback should
   * expect a set of citekeys, and use the appropriate library to generate a
   * bibliography by making use of the citeproc provider. It should return the
   * response from the citeproc provider appropriately.
   *
   * @param   {string[]}  keys  The citation keys to be included in the bibliography.
   *
   * @return  {any}             The citeproc responde.
   */
  onBibliography?: (keys: string[]) => Promise<[{ bibstart: string, bibend: string }, string[]]|undefined>
  /**
   * Can be used to hook into the image tag generation to alter the image's
   * `src` attribute from the Markdown.
   *
   * @param   {string}  src  The link as it is written in the Markdown source.
   *
   * @return  {string}       Returns whatever should be taken as the `src`
   *                         attribute for the resulting `<img>` tag.
   */
  onImageSrc?: (src: string) => string
}

/**
 * This function looks at a GenericNode and returns information regarding the
 * tag that the node should result in.
 *
 * @param   {GenericNode}  node  The input node
 *
 * @return  {HTMLTag}            The HTML tag information
 */
function getTagInfo (node: GenericNode): HTMLTag {
  const ret: HTMLTag = {
    tagName: 'div',
    selfClosing: false,
    attributes: []
  }

  if (node.name === 'HorizontalRule') {
    ret.tagName = 'hr'
    ret.selfClosing = true
  } else if (node.name === 'Paragraph') {
    ret.tagName = 'p'
  } else if (node.name === 'Blockquote') {
    ret.tagName = 'blockquote'
  } else if (node.name === 'FencedCode' || node.name === 'InlineCode') {
    ret.tagName = 'code'
  } else if (node.children.length === 1) {
    ret.tagName = 'span'
  }

  if (ret.tagName === 'p' && node.name !== 'Paragraph') {
    ret.attributes.push([ 'class', node.name.toLowerCase() ])
  }

  if ([ 'span', 'div' ].includes(ret.tagName)) {
    ret.attributes.push([ 'class', node.name.toLowerCase() ])
  }

  return ret
}

/**
 * Returns a ready-to-use HTML attribute string for the provided node.
 *
 * @param   {ASTNode}  node  The node.
 *
 * @return  {string}         The attribute string. Includes leading space if necessary.
 */
function renderNodeAttributes (node: ASTNode): string {
  if (node.attributes === undefined) {
    return ''
  }

  const attr: string[] = []

  for (const [ key, value ] of Object.entries(node.attributes)) {
    let sanitizedValue = value
    if (Array.isArray(sanitizedValue)) {
      switch (key) {
        case 'class':
          sanitizedValue = sanitizedValue.join(' ')
          break
        default:
          // Default: Simply retain the last value.
          sanitizedValue = sanitizedValue.toReversed()[0]
      }
    }

    attr.push(`${key}="${sanitizedValue}"`)
  }

  return ' ' + attr.join(' ')
}

/**
 * Adds any arbitrary attributes to the provided node. NOTE: Will turn any
 * strings into an array of strings where applicable. Later array contents may
 * override earlier ones.
 *
 * @param   {ASTNode}   node    The AST node
 * @param   {string[]}  values  A series of values to add
 *
 * @return  {void}              Modifies in place.
 */
function addAttribute (node: ASTNode, attributeName: string, ...values: string[]): void {
  const attr = node.attributes
  attr[attributeName] = attr[attributeName] ?? []

  if (!Array.isArray(attr[attributeName])) {
    attr[attributeName] = [attr[attributeName]]
  }
  attr[attributeName].push(...values)
}

/**
 * Takes a Markdown AST node and turns it to an HTML string
 *
 * @param   {ASTNode}  node         The node
 * @param   {Function} getCitation  The callback for the citations
 * @param   {number}   indent       The indentation for this node
 *
 * @return  {string}                The HTML string
 */
export function nodeToHTML (node: ASTNode|ASTNode[], options: MD2HTMLOptions, indent: number = 0): string {
  const HIDDEN_GENERIC_NODES = ['Document']

  // Convenience to convert a list of child nodes to HTML
  if (Array.isArray(node)) {
    const body: string[] = []
    for (const child of node) {
      body.push(nodeToHTML(child, options, indent))
    }
    return body.join('')
  } else if (node.type === 'Generic' && HIDDEN_GENERIC_NODES.includes(node.name)) {
    // Some nodes emitted from the AST serve as mere containers and should not
    // be actually emitted by the HTML parser. We do so by converting only its
    // children to HTML, omitting the node entirely.
    return nodeToHTML(node.children, options, indent)
  } else if (node.type === 'YAMLFrontmatter') {
    return '' // Frontmatters must be removed upon HTML export
  } else if (node.type === 'Citation') {
    addAttribute(node, 'class', 'citation')
    const attr = renderNodeAttributes(node)
    const rendered = options.onCitation(node.parsedCitation.items, node.parsedCitation.composite)
    return `${node.whitespaceBefore}<span${attr}>${rendered ?? _.escape(node.value)}</span>`
  } else if (node.type === 'Footnote') {
    addAttribute(node, 'class', 'footnote')
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<sup><a${attr} href="#fnref:${_.escape(node.label)}" name="fn:${_.escape(node.label)}">${_.escape(node.label)}</a></sup>`
  } else if (node.type === 'FootnoteRefLabel') {
    addAttribute(node, 'class', 'footnote-ref-label')
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<sup${attr}><a href="#fn:${_.escape(node.label)}" name="fnref:${_.escape(node.label)}">${node.label}</a></sup>`
  } else if (node.type === 'FootnoteRef') {
    addAttribute(node, 'class', 'footnote-ref')
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<div${attr}>${nodeToHTML(node.children, options, indent)}</div>`
  } else if (node.type === 'Heading') {
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<h${node.level}${attr}>${nodeToHTML(node.children, options, indent)}</h${node.level}>`
  } else if (node.type === 'Highlight') {
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<mark${attr}>${nodeToHTML(node.children, options, indent)}</mark>`
  } else if (node.type === 'Superscript') {
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<sup${attr}>${nodeToHTML(node.children, options, indent)}</sup>`
  } else if (node.type === 'Subscript') {
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<sub${attr}>${nodeToHTML(node.children, options, indent)}</sub>`
  } else if (node.type === 'Image') {
    addAttribute(node, 'src', options.onImageSrc !== undefined ? options.onImageSrc(node.url) : node.url)
    addAttribute(node, 'alt', _.escape(node.alt.value))
    addAttribute(node, 'title', node.title?.value ?? _.escape(node.alt.value))
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<img${attr} />`
  } else if (node.type === 'Link') {
    const title = _.escape(node.title?.value ?? node.alt.value)
    addAttribute(node, 'href', node.url)
    addAttribute(node, 'title', title)
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<a${attr}>${title}</a>`
  } else if (node.type === 'OrderedList') {
    if (node.startsAt > 1) {
      addAttribute(node, 'start', String(node.startsAt))
    }
    if (node.isTaskList) {
      addAttribute(node, 'class', 'task-list')
    }
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<ol${attr}>\n${nodeToHTML(node.items, options, indent)}\n</ol>`
  } else if (node.type === 'BulletList') {
    if (node.isTaskList) {
      addAttribute(node, 'class', 'task-list')
    }
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<ul${attr}>\n${nodeToHTML(node.items, options, indent)}\n</ul>`
  } else if (node.type === 'ListItem') {
    const attr = renderNodeAttributes(node)
    const task = node.checked !== undefined ? `<input type="checkbox" disabled="disabled" ${node.checked ? 'checked="checked"' : ''}>` : ''
    return `${node.whitespaceBefore}<li${attr}>${task}${nodeToHTML(node.children, options, indent + 1)}</li>`
  } else if (node.type === 'Emphasis') {
    const body = nodeToHTML(node.children, options, indent)
    const attr = renderNodeAttributes(node)

    switch (node.which) {
      case 'bold':
        return `${node.whitespaceBefore}<strong${attr}>${body}</strong>`
      case 'italic':
        return `${node.whitespaceBefore}<em${attr}>${body}</em>`
    }
  } else if (node.type === 'Table') {
    const rows: string[] = []
    for (const row of node.rows) {
      const cells: string[] = []
      for (const cell of row.cells) {
        cells.push(nodeToHTML(cell.children, options, indent))
      }
      const tag = row.isHeaderOrFooter ? 'th' : 'td'
      const content = cells.map(c => `<${tag}>${c}</${tag}>`).join('\n')
      const attr = renderNodeAttributes(row)
      if (row.isHeaderOrFooter) {
        rows.push(`${row.whitespaceBefore}<thead>\n<tr${attr}>\n${content}\n</tr>\n</thead>`)
      } else {
        rows.push(`${row.whitespaceBefore}<tr${attr}>\n${content}\n</tr>`)
      }
    }
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<table${attr}>\n${rows.join('\n')}\n</table>`
  } else if (node.type === 'Text') {
    return node.whitespaceBefore + node.value // Plain text
  } else if (node.type === 'FencedCode') {
    if (node.info === '$$') {
      return node.whitespaceBefore + katexToHTML(node.source, true)
    } else {
      addAttribute(node, 'class', `language-${node.info}`)
      const attr = renderNodeAttributes(node)
      return `${node.whitespaceBefore}<pre><code${attr}>${_.escape(node.source)}</code></pre>`
    }
  } else if (node.type === 'InlineCode') {
    if (node.info === '$' || node.info === '$$') {
      return node.whitespaceBefore + katexToHTML(node.source, node.info === '$$')
    } else {
      const attr = renderNodeAttributes(node)
      return `${node.whitespaceBefore}<code${attr}>${_.escape(node.source)}</code>`
    }
  } else if (node.type === 'PandocDiv') {
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<div${attr}>${nodeToHTML(node.children, options, indent)}</div>`
  } else if (node.type === 'PandocSpan') {
    const attr = renderNodeAttributes(node)
    return `${node.whitespaceBefore}<span${attr}>${nodeToHTML(node.children, options, indent)}</span>`
  } else if (node.type === 'Generic') {
    // Generic nodes are differentiated by name. There are a few we can support,
    // but most we wrap in a div.
    const tagInfo = getTagInfo(node)

    if ([ 'div', 'span' ].includes(tagInfo.tagName) && node.children.length === 0) {
      return '' // Simplify the resulting HTML by removing empty elements
    }

    const nodeAttr = renderNodeAttributes(node)
    const attr = tagInfo.attributes.length > 0
      ? ' ' + tagInfo.attributes.map(a => `${a[0]}="${a[1]}"`).join(' ') + nodeAttr
      : nodeAttr

    const open = `${node.whitespaceBefore}<${tagInfo.tagName}${attr}${tagInfo.selfClosing ? '/' : ''}>`
    const close = tagInfo.selfClosing ? '' : `</${tagInfo.tagName}>`
    const body = tagInfo.selfClosing ? '' : nodeToHTML(node.children, options, indent)
    return `${open}${body}${close}`
  } else if (node.type === 'ZettelkastenLink') {
    // NOTE: We count a ZettelkastenLink's title as a TextNode for various
    // purposes, such as spellchecking it, but it should not contain any syntax
    // which is why we directly access its value here.
    return `${node.whitespaceBefore}[[${node.title?.value ?? node.target}]]`
  } else if (node.type === 'ZettelkastenTag') {
    return `${node.whitespaceBefore}#${node.value}`
  }

  return ''
}

/**
 * Turns a set of footnote refs into HTML, wrapping all of them in a wrapper
 * that allows targeting the footnotes in total.
 *
 * @param   {FootnoteRef[]}   fn       The footnote ref AST nodes
 * @param   {MD2HTMLOptions}  options  Markdown->HTML parser options.
 *
 * @return  {string}                   The rendered HTML.
 */
function footnotesToHTML (fn: FootnoteRef[], options: MD2HTMLOptions): string {
  const fnHTML = fn.map(f => nodeToHTML(f, options, 0))
  const html = [
    '<div id="footnote-container">',
    ...fnHTML,
    '</div>'
  ]

  return html.join('\n')
}

/**
 * Takes Markdown source and turns it into a valid HTML fragment. The citeLibrary
 * will be used to resolve citations.
 *
 * @param   {string}           markdown   The Markdown source
 * @param   {MD2HTMLOptions}   options    Options for the conversion
 *
 * @return  {string}                      The resulting HTML
 */
export async function md2html (markdown: string, options: MD2HTMLOptions): Promise<string> {
  const config: MarkdownParserConfig = {
    zknLinkParserConfig: { format: options.zknLinkFormat }
  }

  const ast = markdownToAST(markdown, undefined, config)

  if (ast.type !== 'Document') {
    throw new Error('Could not turn Markdown to HTML: No Document top node returned from parser.')
  }

  const noFootnotes = ast.children.filter(node => node.type !== 'FootnoteRef')
  const onlyFootnotes = ast.children.filter(node => node.type === 'FootnoteRef')

  const html = nodeToHTML(noFootnotes, options)
  const fnHTML = onlyFootnotes.length > 0 ? '\n<hr>\n' + footnotesToHTML(onlyFootnotes, options) : ''

  if (options.onBibliography === undefined) {
    return html + fnHTML // No bibliography wanted
  }

  // Prepare and include a bibliography at the end. We here essentially
  // replicate what the references tab does.
  const keys = extractASTNodes(ast, 'Citation')
    .map((node: ASTNode) => (node as CitationNode).parsedCitation)
    .flatMap(c => c.items.map(item => item.id))

  const bibHTML = await options.onBibliography([...new Set(keys)])
  if (bibHTML !== undefined) {
    const h1 = options.referenceSectionTitle !== undefined ? `<h1>${options.referenceSectionTitle}</h1>` : ''

    return html + h1 +
      [ '\n', bibHTML[0].bibstart, ...bibHTML[1], bibHTML[0].bibend ].join('\n') +
      fnHTML
  }

  return html + fnHTML
}
