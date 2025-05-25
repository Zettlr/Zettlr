/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        html2md function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     html2md converts a string of HTML into valid Markdown.
 *
 * END HEADER
 */

import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify, { type Options } from 'remark-stringify'
import rehypeRemoveComments from 'rehype-remove-comments'
import { unified } from 'unified'

/**
 * Turns the given HTML string to Markdown
 *
 * @param   {string}  html              The HTML input
 * @param   {boolean} stripComments     Whether to strip comments from the HTML
 *                                      source. Defaults to false.
 * @param   {Options} stringifyOptions  Optional options to be passed to remarkStringify
 *
 * @return  {Promise<string>}           The converted Markdown
 */
export default async function html2md (html: string, stripComments = false, stringifyOptions?: Options): Promise<string> {
  const procRetainComments = unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkStringify, stringifyOptions)

  const procRemoveComments = unified()
    .use(rehypeParse)
    .use(rehypeRemoveComments, { removeConditional: true })
    .use(rehypeRemark)
    .use(remarkStringify, stringifyOptions)

  const proc = stripComments ? procRemoveComments : procRetainComments

  const file = await proc.process(html)
  return String(file)
}
