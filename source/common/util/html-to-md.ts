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

import TurndownService from '@joplin/turndown'
import * as turndownGfm from 'joplin-turndown-plugin-gfm'

// HTML to Markdown conversion is better done with Turndown.
const converter = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  blankReplacement: function (content: string, node: any) {
    // A workaround solution for the whitespace deletion issue when copying HTML content
    // from Chromium-based browsers. This method extends the default blankReplacement
    // rule of Joplin-Turndown, all '<span> </span>' will not be replaced.
    if (node.nodeName === 'SPAN') {
      return ' '
    }
    return node.isBlock === true ? '\n\n' : ''
  }
})

// Switch to GithubFlavored Markdown
converter.use(turndownGfm.gfm)

/**
 * Turns the given HTML string to Markdown
 *
 * @param   {string}  html  The HTML input
 *
 * @return  {string}        The converted Markdown
 */
export default function html2md (html: string): string {
  return converter.turndown(html)
}
