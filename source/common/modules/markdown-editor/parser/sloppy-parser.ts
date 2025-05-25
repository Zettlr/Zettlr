/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Image and Link parser
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small parser that can parse images and links that,
 *                  contrary to the built-in parser, allows spaces and non-
 *                  encoded characters in URLs. While this is the correct
 *                  behavior, Markdown has to deal with many local images and
 *                  links, and in there it's quite annoying either to have to
 *                  replace all spaces with %20, or have the images not work.
 *                  Here we basically implement a more "sloppy" parser that
 *                  gives our users the ability to paste readable, non-URL-
 *                  encoded file paths.
 *
 * END HEADER
 */

import { type InlineParser, type Element } from '@lezer/markdown'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'

const mdParser = markdown({ base: markdownLanguage }).language.parser

export const sloppyParser: InlineParser = {
  name: 'sloppy-parser', // Could be a fancy restaurant name or a bad one for a photographer
  before: 'Link',
  parse: (ctx, next, pos) => {
    if (next !== 33 && next !== 91) { // 33 == !, 91 == [
      return -1
    }

    const imgOrLinkRE = /^!?\[[^\]]+\]\(.+\)/i
    const relativeOffset = pos - ctx.offset
    const relativeSlice = ctx.text.slice(relativeOffset)
    const match = imgOrLinkRE.exec(relativeSlice)
    const isLink = next === 91

    if (match === null) {
      return -1
    }

    // NOTE: Since Markdown links can contain brackets, we cannot do this with
    // a RegExp-only solution (we could, but that might render us vulnerable to
    // infinite loops in the RegExp engine if done improperly). Henceforth, we
    // use RegExp only to detect whether there's an actually valid link at the
    // current context position. Next, we literally go char by char to find all
    // the elements we need

    const children: Element[] = []
    // Code Marks: ![
    let from = pos
    let to = from + 1
    children.push(ctx.elt('LinkMark', from, to))
    if (!isLink) {
      children.push(ctx.elt('LinkMark', ++from, ++to))
    }

    // Alt-text
    from = to
    to = from + ctx.text.slice(from - ctx.offset).indexOf(']')

    // The ALT-text can contain inline content (cf.
    // https://spec.commonmark.org/0.30/#example-515) so we have to run an
    // additional inline parse on it.
    const linkLabel = ctx.text.slice(from - ctx.offset, to - ctx.offset)
    const tree = mdParser.parse(linkLabel)
    const cursor = tree.cursor()
    const labelChildren: Element[] = []

    do {
      // ALT text can only contain inline nodes, but the parser will wrap
      // everything in both a Document and a Paragraph b/c it sees its as a
      // standalone document. Since the ALT text can only contain inline
      // elements, we skip the "Document" wrapper and only extract the children
      // of the next "Paragraph" element.
      if (cursor.name === 'Paragraph') {
        let currentChild = cursor.node.firstChild
        while (currentChild !== null) {
          // ctx.elt luckily also takes in an entire Tree, saving us a recursion
          labelChildren.push(
            ctx.elt(currentChild.toTree(), from + currentChild.from)
          )
          currentChild = currentChild.nextSibling
        }
        break
      }
    } while (cursor.next())

    children.push(ctx.elt('LinkLabel', from, to, labelChildren))

    // Code Marks: ](
    from = to
    to = from + 1
    children.push(ctx.elt('LinkMark', from, to))
    children.push(ctx.elt('LinkMark', ++from, ++to))

    // Perform our bracket matching magic ✨
    from = to
    let brackets = 1 // Count the opening bracket
    while (brackets > 0 && to < ctx.offset + ctx.text.length) {
      const c = ctx.text.charAt(to - ctx.offset)
      if (c === '(') {
        brackets++
      } else if (c === ')') {
        brackets--
      }
      to++
    }

    if (brackets > 0) {
      return -1 // The link didn't end until the end of the line
    }

    // Now, `to` points after the final bracket. The next check we have to do is
    // see if there's a title inside.
    let url = ctx.text.slice(from - ctx.offset, to - ctx.offset)

    if (/".+"\)$/.test(url)) {
      // We have a title
      to = from + url.indexOf('"') - 1
      children.push(ctx.elt('URL', from, to))

      from = to + 1
      to = from + 1
      children.push(ctx.elt('LinkMark', from, to))

      const titleLength = url.lastIndexOf('"') - url.indexOf('"') - 1
      from = to
      to = from + titleLength
      children.push(ctx.elt('LinkTitle', from, to))

      from = to
      to = from + 1
      children.push(ctx.elt('LinkMark', from, to))
      children.push(ctx.elt('LinkMark', ++from, ++to))
    } else {
      children.push(ctx.elt('URL', from, to - 1))
      children.push(ctx.elt('LinkMark', to - 1, to))
    }

    const wrapper = ctx.elt(isLink ? 'Link' : 'Image', pos, to, children)
    return ctx.addElement(wrapper)
  }
}
