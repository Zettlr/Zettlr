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

const Turndown = require('joplin-turndown').default
const turndownGfm = require('joplin-turndown-plugin-gfm')

// HTML to Markdown conversion is better done with Turndown.
const converter = new Turndown({
  headingStyle: 'atx',
  hr: '---',
  blankReplacement: function (content, node) {
    // A workaround solution for the whitespace deletion issue when copying HTML content
    // from Chromium-based browsers. This method extends the default blankReplacement
    // rule of Joplin-Turndown, all '<span> </span>' will not be replaced.
    if (node.nodeName === 'SPAN') {
      return ' '
    }
    return node.isBlock ? '\n\n' : ''
  }
})

// Switch to GithubFlavored Markdown
converter.use(turndownGfm.gfm)

/**
 * Turns the given HTML string to Markdown
 *
 * @param   {String}  html  The HTML input
 *
 * @return  {String}        The converted Markdown
 */
module.exports = (html) => {
  return converter.turndown(html)
}
