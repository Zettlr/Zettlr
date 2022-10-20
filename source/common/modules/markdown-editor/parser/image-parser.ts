/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Image parser
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small parser that can parse images. The built-in image
 *                  parser of the Markdown mode is very precise in that it
 *                  doesn't allow spaces in the URLs. While this is the correct
 *                  behavior, mostlz Markdown has to deal with local images, and
 *                  in there it's quite annoying either to have to replace all
 *                  spaces with %20, or have the images not work. Here we
 *                  basically implement a more "sloppy" parser that gives our
 *                  users the ability to paste readable, non-URL-encoded file
 *                  paths.
 *
 * END HEADER
 */

import { InlineParser, Element } from '@lezer/markdown'

export const imageParser: InlineParser = {
  name: 'sloppy-images', // Could be a fancy restaurant name or a bad one for a photographer
  before: 'Image',
  parse: (ctx, next, pos) => {
    const imgRe = /!\[(?<alt>.+?)\]\((?<url>.+?)(?:(<whitespace>\s+)"(?<title>.+)")?\)/i
    const relativeOffset = pos - ctx.offset
    const match = imgRe.exec(ctx.text.slice(relativeOffset))

    if (match === null || match.index > 0) {
      return -1
    }

    // Every image consists of three to four elements:
    const altText = match.groups?.alt ?? ''
    const url = match.groups?.url ?? ''
    const title = match.groups?.title
    const wsLength = (match.groups?.whitespace ?? '').length

    const children: Element[] = []
    // Code Marks: ![
    let from = pos
    let to = from + 1
    children.push(ctx.elt('LinkMark', from, to))
    children.push(ctx.elt('LinkMark', ++from, ++to))
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
    console.warn(url)
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
    // The surrounding Image tag
    from = to
    to = from + 1
    children.push(ctx.elt('LinkMark', from, to))
    const wrapper = ctx.elt('Image', pos, pos + match[0].length, children)
    return ctx.addElement(wrapper)
  }
}
