const { Converter } = require('showdown')
const Citr = require('@zettlr/citr')
const { ipcRenderer } = require('electron')

// Spin up a showdown converter which can be used across the app
var showdownConverter = new Converter({
  strikethrough: true,
  tables: true,
  omitExtraWLInCodeBlocks: true,
  tasklists: true,
  requireSpaceBeforeHeadingText: true,
  ghMentions: false,
  extensions: [showdownCitations]
})

showdownConverter.setFlavor('github')

/**
 * md2html converts the given Markdown to HTML, optionally making any link
 * "renderer" safe, which means that those links will be opened using
 * electron shell to prevent them overriding the content of the window.
 *
 * @param   {string}   markdown                   The input Markdown text
 * @param   {boolean}  [rendererSafeLinks=false]  Whether or not to make any <a> tag renderer-safe
 *
 * @return  {string}                              The final HTML string
 */
module.exports = (markdown, rendererSafeLinks = false) => {
  let html = showdownConverter.makeHtml(markdown)

  if (rendererSafeLinks) {
    const aRE = /<a\s+(.+?)>(.*?)<\/a>/g
    // These two injected attributes make sure none of these anchors will be
    // opened within Electron itself.
    const safetyHandler = 'onclick="require(\'electron\').shell.openExternal(this.getAttribute(\'href\')); return false;"'
    html = html.replace(aRE, function (match, p1, p2, offset, string) {
      return `<a ${p1} ${safetyHandler} target="_blank">${p2}</a>`
    })
  }
  return html
}

/**
 * Extension for showdown.js which parses citations using our citeproc provider.
 *
 * @return  {any}  The showdown extension
 */
function showdownCitations () {
  return {
    type: 'lang',
    filter: function (text, converter, options) {
      // First, extract all citations ...
      const allCitations = Citr.util.extractCitations(text, false)
      // ... and retrieve the final ones from the citeproc provider
      let finalCitations = allCitations.map((elem) => {
        if (ipcRenderer !== undefined) {
          // We are in the renderer process
          return ipcRenderer.sendSync('citation-renderer', {
            command: 'get-citation-sync',
            payload: { citation: elem }
          })
        } else {
          // We are in the main process and can immediately access the provider
          return global.citeproc.getCitation(elem)
        }
      })

      // Finally, replace every citation with its designated replacement
      for (let i = 0; i < allCitations.length; i++) {
        text = text.replace(allCitations[i], finalCitations[i])
      }

      // Now return the text
      return text
    }
  }
}
