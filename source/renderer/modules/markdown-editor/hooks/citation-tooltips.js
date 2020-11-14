const tippy = require('tippy.js').default
const openMarkdownLink = require('../../../util/open-markdown-link')
const ipc = require('electron').ipcRenderer

/**
 * A hook for displaying citation tooltips that show the full reference
 * and provide a direct link to open the corresponding attachment.
 * @param   {CodeMirror}  cm  The instance to attach to
 */
module.exports = (cm) => {
  cm.getWrapperElement().addEventListener('mousemove', async (event) => {
    let span = event.target

    if (!span.classList.contains('citeproc-citation')) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if (span.hasOwnProperty('_tippy')) {
      return
    }

    const citations = span.dataset.citekeys.split(',')

    // Render the full citations
    const citationFull = await global.citeproc.getCitationReference(citations)
    if (citationFull == null || citationFull.length === 0) { return }

    // Generate the corresponding HTML element
    const rootElem = document.createElement('ul')
    rootElem.classList.add('editor-cm-citation-tooltip')
    citationFull.map(item => {
      const li = document.createElement('li')
      li.innerHTML = item[1]
      const link = document.createElement('a')
      link.href = '#'
      link.dataset.citationId = item[0]
      link.classList.add('editor-cm-citation-attachment-link')
      link.innerHTML = '<clr-icon shape="pop-out"></clr-icon>'
      li.insertAdjacentElement('afterbegin', link)
      return li
    }).forEach(elem => rootElem.appendChild(elem))

    // Show a tooltip with the link contents
    tippy(span, {
      content: rootElem,
      allowHTML: true, // Obviously
      maxWidth: 500, // Make a little wider to have enough space for the citation
      interactive: true, // Allow clicking the link
      placement: 'top-start', // Display at the beginning of the anchor
      appendTo: document.body, // As the cma anchors are inline, we need a different anchor-element
      showOnCreate: true, // Immediately show the tooltip
      arrow: false, // No arrow for these tooltips
      onHidden (instance) {
        instance.destroy() // Destroy the tippy instance.
      },
      onShown (instance) {
        // Event listener for all internet links in the reference
        instance.popper.querySelectorAll('a:not(.editor-cm-citation-attachment-link)').forEach(
          (elem) => {
            elem.addEventListener('click', (e) => {
              openMarkdownLink(elem.href, cm)
              e.preventDefault()
            })
          }
        )

        // Event listener for all attachment links in the reference
        instance.popper.querySelectorAll('.editor-cm-citation-attachment-link').forEach(
          (elem) =>
            elem.addEventListener('click', (e) => {
              ipc.send('message', {
                command: 'open-attachment',
                content: { 'citekey': elem.dataset.citationId }
              })
              e.preventDefault()
            })
        )
      }
    })
  })
}
