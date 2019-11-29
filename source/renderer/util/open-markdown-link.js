const { shell } = require('electron')
const path = require('path')
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
    url = url.replace(/^<(.+)>$/, '$1')
    // First try to open the URL itself
    shell.openExternal(url, { activate: true }).catch((e) => {
      if (e) {
        console.warn(`Could not open URL ${url}, trying as file ...`)
        // Okay, didn't work. Let's try a local file (trying to open https
        // will always work, but the browser may complain that
        // https://my-file.pdf won't exist). Always join with the file's
        // base path, as an absolute URL would've been opened.
        let absPath = path.join(editorInstance._cm.getOption('markdownImageBasePath'), url)
        shell.openExternal('file://' + absPath, { activate: true }).catch((e) => {
          if (e) {
            // Chrome, do your job!
            if (!/:\/\//.test(url)) url = 'https://' + url
            shell.openExternal(url, { activate: true }).catch((e) => {
              console.warn(`Could not open URL ${url}`)
              // Notify the user that we couldn't open the URL
              if (e) global.notify(trans('system.error.open_url_error', url))
            })
          }
        })
      }
    }) // P.S.: Did someone notice the sudden callback hell?
  } // End else
}
