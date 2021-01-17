const tippy = require('tippy.js').default
const openMarkdownLink = require('../../../util/open-markdown-link')

/**
 * A hook for displaying link tooltips which can be used to visually
 * enable users to click a link (without having to press down Ctrl/Cmd)
 *
 * @param   {CodeMirror}  cm  The instance to attach to
 */
module.exports = (cm) => {
  cm.getWrapperElement().addEventListener('mousemove', (event) => {
    let a = event.target

    // Only for links with cma-class
    if (a.tagName !== 'A' || !a.classList.contains('cma')) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if (a.hasOwnProperty('_tippy')) {
      return
    }

    // Retrieve the link target
    const linkTarget = a.getAttribute('title')

    // Immediately show a tooltip with the link contents
    tippy(a, {
      content: `<clr-icon shape="pop-out"></clr-icon> <a href="#" id="editor-cm-tooltip-anchor">${linkTarget}</a>`,
      allowHTML: true, // Obviously
      interactive: true, // Allow clicking the link
      placement: 'top-start', // Display at the beginning of the anchor
      appendTo: document.body, // As the cma anchors are inline, we need a different anchor-element
      showOnCreate: true, // Immediately show the tooltip
      arrow: false, // No arrow for these tooltips
      onHidden (instance) {
        instance.destroy() // Destroy the tippy instance.
      },
      onShown (instance) {
        // Hook the event listener
        document
          .getElementById('editor-cm-tooltip-anchor')
          .addEventListener('click', (e) => {
            openMarkdownLink(linkTarget, cm)
          })
      }
    })
  })
}
