const tippy = require('tippy.js').default
const ipcRenderer = window.ipc
const { trans } = require('@common/i18n-renderer')
const formatDate = require('@common/util/format-date').default

/**
 * A hook for displaying link tooltips which display metadata
 * and content of a file
 *
 * @param   {CodeMirror.Editor}  elem  The instance to attach to
 */

module.exports = (elem) => {
  elem.getWrapperElement().addEventListener('mousemove', (event) => {
    const a = event.target

    // Only for note links
    if (!a.classList.contains('cm-zkn-link')) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if (a.hasOwnProperty('_tippy')) {
      return
    }

    // Create a tippy. This will display the loading values
    const tooltip = tippy(a, {
      content: trans('gui.preview_searching_label'),
      allowHTML: true, // Obviously
      interactive: true,
      placement: 'top-start', // Display at the beginning of the anchor
      appendTo: document.body, // anchor
      showOnCreate: true, // Immediately show the tooltip
      arrow: true, // Arrow for these tooltips
      delay: 500
    })

    // Find the file
    ipcRenderer.invoke('application', { command: 'file-find-and-return-meta-data', payload: a.innerText })
      .then((metaData) => {
        if (metaData !== null) {
          // Set the tooltip's contents to the note contents
          const wrapper = getPreviewElement(metaData, a.innerText)

          tooltip.setContent(wrapper)

          // Also, destroy the tooltip as soon as the button is clicked to
          // prevent visual artifacts
          wrapper.querySelector('#open-note').addEventListener('click', (event) => {
            tooltip.destroy()
          })
        } else {
          tooltip.setContent(trans('system.error.fnf_message'))
        }
      }).catch(err => console.error(err))
  })
}

/**
 * Generates the full wrapper element for displaying file information in a
 * tippy tooltip.
 *
 * @param   {string[]}  metadata      The note metadata
 * @param   {string}    linkContents  The link contents (used for navigation)
 *
 * @return  {Element}                 The wrapper element
 */
function getPreviewElement (metadata, linkContents) {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  const title = document.createElement('h4')
  title.classList.add('filename')
  title.textContent = metadata[0]

  const content = document.createElement('div')
  content.classList.add('note-content')
  content.textContent = metadata[1]

  const meta = document.createElement('div')
  meta.classList.add('metadata')
  meta.innerHTML = `${trans('gui.preview_word_count')}: ${metadata[2]}`
  meta.innerHTML += '<br>'
  meta.innerHTML += `${trans('gui.modified')}: ${formatDate(metadata[3])}`

  const actions = document.createElement('div')
  actions.classList.add('actions')

  const openFunc = function () {
    ipcRenderer.invoke('application', {
      command: 'force-open',
      payload: linkContents
    })
      .catch(err => console.error(err))
  }

  const openButton = document.createElement('button')
  openButton.setAttribute('id', 'open-note')
  openButton.textContent = 'Open'
  openButton.addEventListener('click', openFunc)

  actions.appendChild(openButton)

  wrapper.appendChild(title)
  wrapper.appendChild(content)
  wrapper.appendChild(meta)
  wrapper.appendChild(actions)

  return wrapper
}
