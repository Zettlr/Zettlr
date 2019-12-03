const { shell } = require('electron')
const makeValidUri = require('../../common/util/make-valid-uri')
const { trans } = require('../../common/lang/i18n.js')

module.exports = function (url, editorInstance) {
  if (url[0] === '#') {
    // We should open an internal link
    let re = new RegExp('#\\s[^\\r\\n]*?' +
    url.replace(/-/g, '[^\\r\\n]+?').replace(/^#/, ''), 'i')
    // The new regex should now match the corresponding heading in the document
    for (let i = 0; i < editorInstance._cm.lineCount(); i++) {
      let line = editorInstance._cm.getLine(i)
      if (re.test(line)) {
        editorInstance.jtl(i)
        break
      }
    }
  } else {
    // It is valid Markdown to surround the URL with < and >
    url = url.replace(/^<(.+)>$/, '$1') // Looks like an Emoji!
    // We'll be making use of a helper function here, because
    // we cannot rely on the errors thrown by new URL(), as,
    // e.g., file://./relative.md will not throw an error albeit
    // we need to convert it to absolute.
    let base = editorInstance._cm.getOption('markdownImageBasePath')
    let validURI = makeValidUri(url, base)
    shell.openExternal(validURI).catch((err) => {
      // Notify the user that we couldn't open the URL
      if (err) {
        global.notify(trans('system.error.open_url_error', validURI) + ': ' + err.message)
      }
    })
  }
}
