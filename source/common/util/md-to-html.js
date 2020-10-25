const { Converter } = require('showdown')

// Spin up a showdown converter which can be used across the app
var showdownConverter = new Converter()
showdownConverter.setFlavor('github')
showdownConverter.setOption('strikethrough', true)
showdownConverter.setOption('tables', true)
showdownConverter.setOption('omitExtraWLInCodeBlocks', true)
showdownConverter.setOption('tasklists', true)
showdownConverter.setOption('requireSpaceBeforeHeadingText', true)
showdownConverter.setOption('ghMentions', false)

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
