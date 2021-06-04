const tippy = require('tippy.js').default
const ipcRenderer = window.ipc

/**
 * A hook for displaying link tooltips which display metadata
 * and content of a file
 *
 * @param   {CodeMirror}  cm  The instance to attach to
 */

module.exports = (elem) => {
  elem.getWrapperElement().addEventListener('mousemove', (event) => {
    let a = event.target

    // Only for note links
    if (!a.classList.contains('cm-zkn-link')) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if (a.hasOwnProperty('_tippy')) {
      return
    }
    // TODO: Translate!

    // Create a tippy. This will display the loading values
    let tooltip = tippy(a, {
      content: 'Searching For File...',
      allowHTML: true, // Obviously
      interactive: true,
      placement: 'top-start', // Display at the beginning of the anchor
      appendTo: document.body, // anchor
      showOnCreate: true, // Immediately show the tooltip
      arrow: true // Arrow for these tooltips
    })

    // Find the file's absolute path
    ipcRenderer.invoke('application', { command: 'file-find-and-return-meta-data', payload: a.innerText })
      .then((metaData) => {
        // If the file is found
        if (metaData !== null) {
          // On ready, show a tooltip with the note contents
          tooltip.setContent(`File Name: "${metaData[0]}"<br>"${metaData[1]}"<br>Word Count: ${metaData[2]}<br> Modified: ${metaData[3]}`)
        } else {
          tooltip.setContent('File Not Found') // TODO: Translate!
        }
      }).catch(err => console.log('File path find error: ' + err))
  })
}
