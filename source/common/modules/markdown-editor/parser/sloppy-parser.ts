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

import { InlineParser, Element } from '@lezer/markdown'

export const sloppyParser: InlineParser = {
  name: 'sloppy-parser', // Could be a fancy restaurant name or a bad one for a photographer
  before: 'Link',
  parse: (ctx, next, pos) => {
    const imgOrLinkRE = /^!?\[(?<alt>.+?)\]\((?<url>.+?)(?:(<whitespace>\s+)"(?<title>.+)")?\)/i
    const relativeOffset = pos - ctx.offset
    const relativeSlice = ctx.text.slice(relativeOffset)
    const match = imgOrLinkRE.exec(relativeSlice)
    const isLink = !relativeSlice.startsWith('!')

    if (match === null) {
      return -1
    }

    // Every image consists of three to four elements:
    const altText = match.groups?.alt ?? ''
    const url = match.groups?.url ?? ''
    const title = match.groups?.title ?? ''
    const wsLength = (match.groups?.whitespace ?? '').length

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
    to = from + altText.length
    children.push(ctx.elt('LinkLabel', from, to))
    // Code Marks: ](
    from = to
    to = from + 1
    children.push(ctx.elt('LinkMark', from, to))
    children.push(ctx.elt('LinkMark', ++from, ++to))
    // URL
    from = to
    to = from + url.length
    children.push(ctx.elt('URL', from, to))
    if (title !== undefined && title.length > 0) {
      // Code Mark: quote
      from = to + wsLength // Ignore the space(s)
      to = from + 1
      children.push(ctx.elt('LinkMark', from, to))
      // Optional Title
      from = to
      to = from + title.length
      children.push(ctx.elt('LinkTitle', from, to))
      // Code Mark: "
      from = to
      to = from + 1
      children.push(ctx.elt('LinkMark', from, to))
    }
    // The surrounding Image/Link tag
    from = to
    to = from + 1
    children.push(ctx.elt('LinkMark', from, to))
    const wrapper = ctx.elt(isLink ? 'Link' : 'Image', pos, pos + match[0].length, children)
    return ctx.addElement(wrapper)
  }
}
