// This is a plugin that needs a specific CodeMirror instance to work, hence
// it's not in the plugins folder.

const tippy = require('tippy.js').default
const md2html = require('../../../../common/util/md-to-html')

module.exports = (cm) => {
  // Hook into click events
  cm.getWrapperElement().addEventListener('click', (event) => {
    // Open links on both Cmd and Ctrl clicks - otherwise stop handling event
    let cursor = cm.coordsChar({ left: event.clientX, top: event.clientY })

    if (process.platform === 'darwin' && !event.metaKey) return true
    if (process.platform !== 'darwin' && !event.ctrlKey) return true
    if (cm.isReadOnly()) return true
    if (cm.getModeAt(cursor).name !== 'markdown') return true

    event.preventDefault()

    let tokenInfo = cm.getTokenAt(cursor)
    let tokenList = tokenInfo.type.split(' ')
    let startsWithCirc = tokenInfo.string.indexOf('^') === 0

    // A link (reference) that starts with a cironflex is a footnote
    if (tokenList.includes('link') && startsWithCirc) {
      editFootnote(cm, event.target)
    }
  })

  // Hook into mousemove events to show a footnote tooltip
  cm.getWrapperElement().addEventListener('mousemove', (e) => {
    let t = e.target
    if (t.classList.contains('cm-link') && t.textContent.indexOf('^') === 0) {
      showFootnoteTooltip(cm, t)
    }
  })
}

/**
 * Displays a tooltip containing the footnote text
 *
 * @param   {CodeMirror} cm       The CodeMirror instance
 * @param   {Element}    element  The DOM element to center on
 */
function showFootnoteTooltip (cm, element) {
  // First let us see if there is already a tippy-instance bound to this.
  // If so, we can abort now.
  if (element.hasOwnProperty('_tippy')) {
    return
  }

  // Because we highlight the formatting as well, the element's text will
  // only contain ^<id> without the brackets
  let fn = element.textContent.substr(1)
  let fnref = ''

  // Now find the respective line and extract the footnote content using
  // our RegEx from the footnotes plugin.
  let fnrefRE = /^\[\^([\da-zA-Z_-]+)\]: (.+)/gm

  for (let lineNo = cm.doc.lastLine(); lineNo > -1; lineNo--) {
    fnrefRE.lastIndex = 0
    let line = cm.doc.getLine(lineNo)
    let match = null
    if (((match = fnrefRE.exec(line)) != null) && (match[1] === fn)) {
      fnref = match[2]
      break
    }
  }

  // TODO translate this message!
  fnref = (fnref && fnref !== '') ? fnref : '_No reference text_'

  // For preview we should convert the footnote text to HTML.
  fnref = md2html(fnref, true) // Ensure safe links

  // Now we either got a match or an empty fnref. So create a tippy
  // instance
  tippy(element, {
    'content': fnref,
    allowHTML: true,
    onHidden (instance) {
      instance.destroy() // Destroy the tippy instance.
    },
    arrow: true,
    interactive: true, // Enable clicking on links, etc.
    appendTo: document.body // Necessary because these tippys are interactive
  }).show() // Immediately show the tooltip
}

/**
 * Displays a small textarea to edit footnote text
 *
 * @param   {CodeMirror} cm       The CodeMirror instance
 * @param   {Element}    element  The target element
 */
function editFootnote (cm, element) {
  let ref = element.textContent.substr(1)
  let line = null

  cm.eachLine((handle) => {
    if (handle.text.indexOf(`[^${ref}]:`) === 0) {
      // Got the line
      line = handle
    }
  })

  // TODO: Enable multiline footnotes

  if (line === null) return // No matching reference found

  const data = { 'content': line.text.substr(5 + ref.length) }
  global.popupProvider.show('footnote-edit', element, data)

  // Focus the textarea immediately.
  document.getElementById('#footnote-edit-textarea').focus()

  const fnTextarea = document.querySelector('.popup .footnote-edit')

  fnTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Done editing.
      e.preventDefault()
      let newtext = `[^${ref}]: ${fnTextarea.value}`
      let sc = cm.getSearchCursor(line.text, { 'line': 0, 'ch': 0 })
      sc.findNext()
      sc.replace(newtext)
      global.popupProvider.close()
    }
  })
}
