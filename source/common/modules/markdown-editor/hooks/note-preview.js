const tippy = require('tippy.js').default
const ipcRenderer = window.ipc
const { trans } = require('../../../i18n-renderer')
const formatDate = require('../../../util/format-date')

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

    // Create a tippy. This will display the loading values
    let tooltip = tippy(a, {
      content: trans('gui.preview_searching_label'),
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
          const content = `
          <div class="editor-note-preview">
            <h4 class="filename">${metaData[0]}</h4>
            <div class="note-content">${metaData[1]}</div>
            <div class="metadata">
              ${trans('gui.preview_word_count')}: ${metaData[2]}<br>${trans('gui.preview_modification_date')}: ${formatDate(metaData[3])}
            </div>
          </div>
          `
          tooltip.setContent(content)
        } else {
          tooltip.setContent(trans('system.error.fnf_message'))
        }
      }).catch(err => console.error(err))
  })
}
