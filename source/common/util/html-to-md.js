
const Turndown = require('joplin-turndown').default
const turndownGfm = require('joplin-turndown-plugin-gfm')

// HTML to Markdown conversion is better done with Turndown.
const converter = new Turndown({
  headingStyle: 'atx',
  hr: '---'
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
