/* global CodeMirror define */
// This plugin renders iFrames in CodeMirror instances

const { getIframeRE } = require('../../../../common/regular-expressions');

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  var iframeRE = getIframeRE() // Matches all iframes

  // Utility function that only retains the source of an iframe and omits all
  // other (potentially insecure) attributes, e.g., srcdoc (mentioned as part
  // of JPCERT#90544144).
  function renderIframe (src) {
    const iframe = document.createElement('iframe')
    iframe.src = src
    return iframe
  }

  CodeMirror.commands.markdownRenderIframes = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if ((match = iframeRE.exec(line)) == null) {
        continue
      }

      if (cm.getCursor('from').line === i) {
        // We're directly in the formatting so don't render.
        continue
      }

      let curFrom = { 'line': i, 'ch': 0 }
      let curTo = { 'line': i, 'ch': match[0].length }

      // We can only have one marker at any given position at any given time
      if (cm.doc.findMarks(curFrom, curTo).length > 0) continue

      // Now we can render it finally.

      // BEGIN: Backport commit 53b544b2
      // as part of JPCERT/CC JVN#98239374 / TN: JPCERT#90544144
      const iframeSrc = match[1]
      // Retrieve the hostname from the iframe's source
      const hostname = (new URL(iframeSrc)).hostname

      // Retrieve the global whitelist to check if we can immediately render this
      const whitelist = global.config.get('system.iframeWhitelist')

      if (whitelist.includes(hostname) === true) {
        // The hostname is whitelisted, so render this iFrame immediately
        cm.doc.markText(
          curFrom, curTo,
          {
            'clearOnEnter': true,
            'replacedWith': renderIframe(iframeSrc),
            'inclusiveLeft': false,
            'inclusiveRight': false
          }
        )
      } else {
        // The hostname was not whitelisted, so notify the user
        const wrapper = document.createElement('div')
        wrapper.classList.add('iframe-warning-wrapper')
        const info = document.createElement('p')
        info.innerHTML = `iFrame elements can contain harmful content. The hostname <strong>${hostname}</strong> is not yet trusted. Do you wish to render this iFrame?`
        const renderAlways = document.createElement('button')
        renderAlways.textContent = `Always allow content from ${hostname}`
        const renderOnce = document.createElement('button')
        renderOnce.textContent = 'Render this time only'

        wrapper.appendChild(info)
        wrapper.appendChild(renderAlways)
        wrapper.appendChild(renderOnce)

        const marker = cm.doc.markText(
          curFrom, curTo,
          {
            'clearOnEnter': true,
            'replacedWith': wrapper,
            'inclusiveLeft': false,
            'inclusiveRight': false
          }
        )

        renderOnce.onclick = (event) => {
          // Render the iFrame, but only this time
          const iframe = renderIframe(iframeSrc)
          wrapper.replaceWith(iframe)
          marker.changed() // Notify CodeMirror of the potentially updated size
        }

        renderAlways.onclick = (event) => {
          // Render the iFrame and also add the hostname to the whitelist
          const iframe = renderIframe(iframeSrc)
          wrapper.replaceWith(iframe)
          marker.changed()

          const currentWhitelist = global.config.get('system.iframeWhitelist')
          currentWhitelist.push(hostname)
          global.config.set('system.iframeWhitelist', currentWhitelist)
        }
      }
    }
  }
})
