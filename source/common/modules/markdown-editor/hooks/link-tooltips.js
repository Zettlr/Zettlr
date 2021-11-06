/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror link tooltip hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Shows a tooltip when hovering over links, enabling
 *                  point-and-click link opening.
 *
 * END HEADER
 */

import tippy, { followCursor } from 'tippy.js'
// const tippy = require('tippy.js').default
import openMarkdownLink from '../open-markdown-link'

let timeout

/**
 * A hook for displaying link tooltips which can be used to visually
 * enable users to click a link (without having to press down Ctrl/Cmd)
 *
 * @param   {CodeMirror}  cm  The instance to attach to
 */
export default function linkTooltipsHook (cm) {
  cm.getWrapperElement().addEventListener('mousemove', (event) => {
    if (timeout !== undefined) {
      clearTimeout(timeout)
      timeout = undefined
    }

    const a = event.target

    // Only for links with cma-class
    if (a.tagName !== 'A' || a.classList.contains('cma') === false) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if ('_tippy' in a) {
      return
    }

    // Retrieve the link target
    const linkTarget = a.getAttribute('title')

    // Immediately show a tooltip with the link contents
    timeout = setTimeout(() => {
      showTippy(a, linkTarget, cm)
      timeout = undefined
    }, 1000) // 1s delay
  })
}

function showTippy (element, target, cm) {
  // Find the containing CodeMirror DOM element. We can't unfortunately append
  // it to the element nor the body
  const parent = element.closest('.CodeMirror')
  tippy(element, {
    content: `<clr-icon shape="pop-out"></clr-icon> <a href="#" id="editor-cm-tooltip-anchor">${target}</a>`,
    allowHTML: true, // Obviously
    interactive: true, // Allow clicking the link
    placement: 'top', // Display at the beginning of the anchor
    followCursor: 'horizontal', // Necessary for links that begin at the end of a line and end at the beginning of the next one
    appendTo: parent, // As the cma anchors are inline, we need a different anchor-element
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
          openMarkdownLink(target, cm)
        })
    },
    plugins: [followCursor]
  })
}
