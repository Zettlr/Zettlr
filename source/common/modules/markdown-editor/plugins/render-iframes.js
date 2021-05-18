/* global CodeMirror define */
// This plugin renders iFrames in CodeMirror instances

const { getIframeRE } = require('../../../regular-expressions');

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

  const iframeRE = getIframeRE() // Matches all iframes

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

      // Now we can render it. But not quite. In order to prevent XSS attacks,
      // let's not render it immediately, but rather check the domain. If it's
      // part of the whitelist, all good, but if not, don't render it.
      // NOTE: We'll be making use of the HOSTNAME property of the URL constructor.
      const iframeSrc = match[1]
      const hostname = (new URL(iframeSrc)).hostname

      // Check if the hostname is part of our whitelist
      const whitelist = global.config.get('system.iframeWhitelist')

      if (whitelist.includes(hostname) === true) {
        // The hostname is part of the whitelist, so let's immediately render it.
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
        // Not whitelisted, so let us not render it right now, but rather ask
        // the user before.
        const wrapper = document.createElement('div')
        wrapper.classList.add('iframe-warning-wrapper')
        const info = document.createElement('p')
        info.innerHTML = `iFrame elements can contain harmful content. The hostname <strong>${hostname}</strong> is not yet marked as safe. Do you wish to render this iFrame?`
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
