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

import katex from 'katex'
import 'katex/contrib/mhchem'
import { markdownToAST } from '.'
import { type ASTNode, type GenericNode } from './markdown-ast'
import { type MarkdownParserConfig } from '../markdown-editor/parser/markdown-parser'

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

export interface MD2HTMLCallbacks {
  /**
   * Can be used to hook into the image tag generation to alter the image's
   * `src` attribute from the Markdown.
   *
   * @param   {string}  src  The link as it is written in the Markdown source.
   *
   * @return  {string}       Returns whatever should be taken as the `src`
   *                         attribute for the resulting `<img>` tag.
   */
  onImageSrc: (src: string) => string
}

/**
 * Use this function to convert plain text contents to HTML entities before
 * converting an AST to HTML.
 *
 * @param   {string}  text  The input string
 *
 * @return  {string}        The string with HTML entities replaced
 */
function htmlEntities (text: string): string {
  // List taken from https://www.freeformatter.com/html-entities.html
  // Not necessarily, complete, but it's 2023 and everyone should just support
  // Unicode.
  text = text.replace('&', '&amp;')
  text = text.replace('<', '&lt;')
  text = text.replace('>', '&gt;')
  text = text.replace('"', '&quot;')
  text = text.replace(' ', '&nbsp;')
  text = text.replace('¡', '&iexcl;')
  text = text.replace('¢', '&cent;')
  text = text.replace('£', '&pound;')
  text = text.replace('¤', '&curren;')
  text = text.replace('¥', '&yen;')
  text = text.replace('¦', '&brvbar;')
  text = text.replace('§', '&sect;')
  text = text.replace('¨', '&uml;')
  text = text.replace('©', '&copy;')
  text = text.replace('ª', '&ordf;')
  text = text.replace('«', '&laquo;')
  text = text.replace('¬', '&not;')
  text = text.replace('®', '&reg;')
  text = text.replace('¯', '&macr;')
  text = text.replace('°', '&deg;')
  text = text.replace('±', '&plusmn;')
  text = text.replace('¹', '&sup1;')
  text = text.replace('²', '&sup2;')
  text = text.replace('³', '&sup3;')
  text = text.replace('´', '&acute;')
  text = text.replace('µ', '&micro;')
  text = text.replace('¶', '&para;')
  text = text.replace('¸', '&cedil;')
  text = text.replace('º', '&ordm;')
  text = text.replace('»', '&raquo;')
  text = text.replace('¼', '&frac14;')
  text = text.replace('½', '&frac12;')
  text = text.replace('¾', '&frac34;')
  text = text.replace('¿', '&iquest;')
  text = text.replace('×', '&times;')
  text = text.replace('÷', '&divide;')
  text = text.replace('∀', '&forall;')
  text = text.replace('∂', '&part;')
  text = text.replace('∃', '&exist;')
  text = text.replace('∅', '&empty;')
  text = text.replace('∇', '&nabla;')
  text = text.replace('∈', '&isin;')
  text = text.replace('∉', '&notin;')
  text = text.replace('∋', '&ni;')
  text = text.replace('∏', '&prod;')
  text = text.replace('∑', '&sum;')
  text = text.replace('−', '&minus;')
  text = text.replace('∗', '&lowast;')
  text = text.replace('√', '&radic;')
  text = text.replace('∝', '&prop;')
  text = text.replace('∞', '&infin;')
  text = text.replace('∠', '&ang;')
  text = text.replace('∧', '&and;')
  text = text.replace('∨', '&or;')
  text = text.replace('∩', '&cap;')
  text = text.replace('∪', '&cup;')
  text = text.replace('∫', '&int;')
  text = text.replace('∴', '&there4;')
  text = text.replace('∼', '&sim;')
  text = text.replace('≅', '&cong;')
  text = text.replace('≈', '&asymp;')
  text = text.replace('≠', '&ne;')
  text = text.replace('≡', '&equiv;')
  text = text.replace('≤', '&le;')
  text = text.replace('≥', '&ge;')
  text = text.replace('⊂', '&sub;')
  text = text.replace('⊃', '&sup;')
  text = text.replace('⊄', '&nsub;')
  text = text.replace('⊇', '&supe;')
  text = text.replace('⊕', '&oplus;')
  text = text.replace('⊗', '&otimes;')
  text = text.replace('⊥', '&perp;')
  text = text.replace('⋅', '&sdot;')
  text = text.replace('Α', '&Alpha;')
  text = text.replace('Β', '&Beta;')
  text = text.replace('Γ', '&Gamma;')
  text = text.replace('Δ', '&Delta;')
  text = text.replace('Ε', '&Epsilon;')
  text = text.replace('Ζ', '&Zeta;')
  text = text.replace('Η', '&Eta;')
  text = text.replace('Θ', '&Theta;')
  text = text.replace('Ι', '&Iota;')
  text = text.replace('Κ', '&Kappa;')
  text = text.replace('Λ', '&Lambda;')
  text = text.replace('Μ', '&Mu;')
  text = text.replace('Ν', '&Nu;')
  text = text.replace('Ξ', '&Xi;')
  text = text.replace('Ο', '&Omicron;')
  text = text.replace('Π', '&Pi;')
  text = text.replace('Ρ', '&Rho;')
  text = text.replace('Σ', '&Sigma;')
  text = text.replace('Τ', '&Tau;')
  text = text.replace('Υ', '&Upsilon;')
  text = text.replace('Φ', '&Phi;')
  text = text.replace('Χ', '&Chi;')
  text = text.replace('Ψ', '&Psi;')
  text = text.replace('Ω', '&Omega;')
  text = text.replace('α', '&alpha;')
  text = text.replace('β', '&beta;')
  text = text.replace('γ', '&gamma;')
  text = text.replace('δ', '&delta;')
  text = text.replace('ε', '&epsilon;')
  text = text.replace('ζ', '&zeta;')
  text = text.replace('η', '&eta;')
  text = text.replace('θ', '&theta;')
  text = text.replace('ι', '&iota;')
  text = text.replace('κ', '&kappa;')
  text = text.replace('λ', '&lambda;')
  text = text.replace('μ', '&mu;')
  text = text.replace('ν', '&nu;')
  text = text.replace('ξ', '&xi;')
  text = text.replace('ο', '&omicron;')
  text = text.replace('π', '&pi;')
  text = text.replace('ρ', '&rho;')
  text = text.replace('ς', '&sigmaf;')
  text = text.replace('σ', '&sigma;')
  text = text.replace('τ', '&tau;')
  text = text.replace('υ', '&upsilon;')
  text = text.replace('φ', '&phi;')
  text = text.replace('χ', '&chi;')
  text = text.replace('ψ', '&psi;')
  text = text.replace('ω', '&omega;')
  text = text.replace('ϑ', '&thetasym;')
  text = text.replace('ϒ', '&upsih;')
  text = text.replace('ϖ', '&piv;')
  text = text.replace('Œ', '&OElig;')
  text = text.replace('œ', '&oelig;')
  text = text.replace('Š', '&Scaron;')
  text = text.replace('š', '&scaron;')
  text = text.replace('Ÿ', '&Yuml;')
  text = text.replace('ƒ', '&fnof;')
  text = text.replace('ˆ', '&circ;')
  text = text.replace('˜', '&tilde;')
  text = text.replace(' ', '&ensp;')
  text = text.replace(' ', '&emsp;')
  text = text.replace(' ', '&thinsp;')
  text = text.replace('‌', '&zwnj;')
  text = text.replace('‍', '&zwj;')
  text = text.replace('‎', '&lrm;')
  text = text.replace('‏', '&rlm;')
  text = text.replace('–', '&ndash;')
  text = text.replace('—', '&mdash;')
  text = text.replace('‘', '&lsquo;')
  text = text.replace('’', '&rsquo;')
  text = text.replace('‚', '&sbquo;')
  text = text.replace('“', '&ldquo;')
  text = text.replace('”', '&rdquo;')
  text = text.replace('„', '&bdquo;')
  text = text.replace('†', '&dagger;')
  text = text.replace('‡', '&Dagger;')
  text = text.replace('•', '&bull;')
  text = text.replace('…', '&hellip;')
  text = text.replace('‰', '&permil;')
  text = text.replace('′', '&prime;')
  text = text.replace('″', '&Prime;')
  text = text.replace('‹', '&lsaquo;')
  text = text.replace('›', '&rsaquo;')
  text = text.replace('‾', '&oline;')
  text = text.replace('€', '&euro;')
  text = text.replace('™', '&trade;')
  text = text.replace('←', '&larr;')
  text = text.replace('↑', '&uarr;')
  text = text.replace('→', '&rarr;')
  text = text.replace('↓', '&darr;')
  text = text.replace('↔', '&harr;')
  text = text.replace('↵', '&crarr;')
  text = text.replace('⌈', '&lceil;')
  text = text.replace('⌉', '&rceil;')
  text = text.replace('⌊', '&lfloor;')
  text = text.replace('⌋', '&rfloor;')
  text = text.replace('◊', '&loz;')
  text = text.replace('♠', '&spades;')
  text = text.replace('♣', '&clubs;')
  text = text.replace('♥', '&hearts;')
  text = text.replace('♦', '&diams;')
  return text
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
  } else if (node.name === 'FencedCode' || node.name === 'InlineCode') {
    ret.tagName = 'code'
  } else if (node.children.length === 1) {
    ret.tagName = 'span'
  }

  if ([ 'span', 'div', 'p' ].includes(ret.tagName)) {
    ret.attributes.push([ 'class', node.name ])
  }

  return ret
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
function nodeToHTML (node: ASTNode|ASTNode[], getCitation: CitationCallback, hooks: Partial<MD2HTMLCallbacks>, indent: number = 0): string {
  // Convenience to convert a list of child nodes to HTML
  if (Array.isArray(node)) {
    const body: string[] = []
    for (const child of node) {
      body.push(nodeToHTML(child, getCitation, hooks, indent))
    }
    return body.join('')
  } else if (node.type === 'Generic' && node.name === 'Document') {
    // This ensures there's no outer div class=Document
    return nodeToHTML(node.children, getCitation, hooks, indent)
  } else if (node.type === 'YAMLFrontmatter') {
    return '' // Frontmatters must be removed upon HTML export
  } else if (node.type === 'Citation') {
    const rendered = getCitation(node.parsedCitation.citations, node.parsedCitation.composite)
    return `${node.whitespaceBefore}<span class="citation">${rendered ?? htmlEntities(node.value)}</span>`
  } else if (node.type === 'Footnote') {
    return `${node.whitespaceBefore}<a class="footnote" href="#fnref:${htmlEntities(node.label)}">${htmlEntities(node.label)}</a>`
  } else if (node.type === 'FootnoteRef') {
    return `${node.whitespaceBefore}<div class="footnote-ref"><a name="fnref:${htmlEntities(node.label)}"></a>${nodeToHTML(node.children, getCitation, hooks, indent)}</div>`
  } else if (node.type === 'Heading') {
    return `${node.whitespaceBefore}<h${node.level}>${htmlEntities(node.value.value)}</h${node.level}>`
  } else if (node.type === 'Highlight') {
    return `${node.whitespaceBefore}<mark>${nodeToHTML(node.children, getCitation, hooks, indent)}</mark>`
  } else if (node.type === 'Superscript') {
    return `${node.whitespaceBefore}<sup>${nodeToHTML(node.children, getCitation, hooks, indent)}</sup>`
  } else if (node.type === 'Subscript') {
    return `${node.whitespaceBefore}<sub>${nodeToHTML(node.children, getCitation, hooks, indent)}</sub>`
  } else if (node.type === 'Image') {
    const src = hooks.onImageSrc !== undefined ? hooks.onImageSrc(node.url) : node.url
    console.log(`Original Url is: ${node.url}. Converted is: ${src}`)
    return `${node.whitespaceBefore}<img src="${src}" alt="${htmlEntities(node.alt.value)}" title="${node.title?.value ?? htmlEntities(node.alt.value)}">`
  } else if (node.type === 'Link') {
    return `${node.whitespaceBefore}<a href="${node.url}" title="${node.title?.value ?? htmlEntities(node.url)}">${htmlEntities(node.alt.value)}</a>`
  } else if (node.type === 'OrderedList') {
    const startsAt = node.startsAt > 1 ? ` start="${node.startsAt}"` : ''
    return `${node.whitespaceBefore}<ol${startsAt}>\n${nodeToHTML(node.items, getCitation, hooks, indent)}\n</ol>`
  } else if (node.type === 'BulletList') {
    return `${node.whitespaceBefore}<ul>\n${nodeToHTML(node.items, getCitation, hooks, indent)}\n</ul>`
  } else if (node.type === 'ListItem') {
    const task = node.checked !== undefined ? `<input type="checkbox" disabled="disabled" ${node.checked ? 'checked="checked"' : ''}>` : ''
    return `${node.whitespaceBefore}<li>${task}${nodeToHTML(node.children, getCitation, hooks, indent + 1)}</li>`
  } else if (node.type === 'Emphasis') {
    const body = nodeToHTML(node.children, getCitation, hooks, indent)

    switch (node.which) {
      case 'bold':
        return `${node.whitespaceBefore}<strong>${body}</strong>`
      case 'italic':
        return `${node.whitespaceBefore}<em>${body}</em>`
    }
  } else if (node.type === 'Table') {
    const rows: string[] = []
    for (const row of node.rows) {
      const cells: string[] = []
      for (const cell of row.cells) {
        cells.push(nodeToHTML(cell.children, getCitation, hooks, indent))
      }
      const tag = row.isHeaderOrFooter ? 'th' : 'td'
      const content = cells.map(c => `<${tag}>${c}</${tag}>`).join('\n')
      if (row.isHeaderOrFooter) {
        rows.push(`${row.whitespaceBefore}<thead>\n<tr>\n${content}\n</tr>\n</thead>`)
      } else {
        rows.push(`${row.whitespaceBefore}<tr>\n${content}\n</tr>`)
      }
    }
    return `${node.whitespaceBefore}<table>\n${rows.join('\n')}\n</table>`
  } else if (node.type === 'Text') {
    return node.whitespaceBefore + node.value // Plain text
  } else if (node.type === 'FencedCode') {
    if (node.info === '$$') {
      return node.whitespaceBefore + katex.renderToString(node.source)
    } else {
      return `${node.whitespaceBefore}<pre><code class="language-${node.info}">${htmlEntities(node.source)}</code></pre>`
    }
  } else if (node.type === 'InlineCode') {
    return `${node.whitespaceBefore}<code>${htmlEntities(node.source)}</code>`
  } else if (node.type === 'Generic') {
    // Generic nodes are differentiated by name. There are a few we can support,
    // but most we wrap in a div.
    const tagInfo = getTagInfo(node)

    if ([ 'div', 'span' ].includes(tagInfo.tagName) && node.children.length === 0) {
      return '' // Simplify the resulting HTML by removing empty elements
    }

    const attr = tagInfo.attributes.length > 0
      ? ' ' + tagInfo.attributes.map(a => `${a[0]}="${a[1]}"`).join(' ')
      : ''

    const open = `${node.whitespaceBefore}<${tagInfo.tagName}${attr}${tagInfo.selfClosing ? '/' : ''}>`
    const close = tagInfo.selfClosing ? '' : `</${tagInfo.tagName}>`
    const body = tagInfo.selfClosing ? '' : nodeToHTML(node.children, getCitation, hooks)
    return `${open}${body}${close}`
  } else if (node.type === 'ZettelkastenLink') {
    // NOTE: We count a ZettelkastenLink's title as a TextNode for various
    // purposes, such as spellchecking it, but it should not contain any syntax
    // which is why we directly access its value here.
    return `${node.whitespaceBefore}[[${node.title.value}]]`
  } else if (node.type === 'ZettelkastenTag') {
    return `${node.whitespaceBefore}#${node.value}`
  }

  return ''
}

/**
 * Takes Markdown source and turns it into a valid HTML fragment. The citeLibrary
 * will be used to resolve citations.
 *
 * @param   {string}           markdown       The Markdown source
 * @param   {Function}         getCitation    The citation callback to use
 * @param   {string}           zknLinkFormat  (Optional) The Wikilink format
 * @param   {MD2HTMLCallbacks} hooks          Any hooks that can be used to programmatically alter the produced HTML
 *
 * @return  {string}                   The resulting HTML
 */
export function md2html (markdown: string, getCitation: CitationCallback, zknLinkFormat: 'link|title'|'title|link' = 'link|title', hooks?: Partial<MD2HTMLCallbacks>): string {
  const config: MarkdownParserConfig = {
    zknLinkParserConfig: { format: zknLinkFormat }
  }
  const ast = markdownToAST(markdown, undefined, config)
  return nodeToHTML(ast, getCitation, hooks ?? {})
}
