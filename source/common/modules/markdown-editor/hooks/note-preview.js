const tippy = require('tippy.js').default
const openMarkdownLink = require('../open-markdown-link')
const { ipcRenderer } = require('electron')


/**
 * A hook for displaying link tooltips which can be used to visually
 * enable users to click a link (without having to press down Ctrl/Cmd)
 *
 * @param   {CodeMirror}  cm  The instance to attach to
 */
module.exports = (cm) => {
  cm.getWrapperElement().addEventListener('mousemove', (event) => {
    let a = event.target

    // Only for note links
    if (!a.classList.contains('cm-zkn-link')) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if (a.hasOwnProperty('_tippy')) {
      return
    }

    // Initialise displayed attributes to 'loading'
    let title = "loading"
    let content = "loading"
    let wordCount = "loading"
    let days = "loading"
    // Create a tippy. This will display the loading values
    let tooltip = tippy(a, {
      content: `Searching for file...`,
      allowHTML: true, // Obviously
      interactive: true,
      placement: 'top-start', // Display at the beginning of the anchor
      appendTo: document.body, // anchor
      showOnCreate: true, // Immediately show the tooltip
      arrow: false, // No arrow for these tooltips
      onHidden(instance) {
        instance.destroy() // Destroy the tippy instance.
      },
    })

    // Find the file's absolute path
    ipcRenderer.invoke('application', { command: 'file-path-find', payload: a.innerText })
      .then((filepath) => {
        // If the file is found
        if (filepath != "Not Found") {

          // Retrieve the file contets
          ipcRenderer.invoke('application', { command: 'get-file-contents', payload: filepath })
            .then((descriptorWithContent) => {

              // Get the contents of the file such as:
              content = descriptorWithContent.content.substring(0, 50) // The text, up to 50 chars
              wordCount = descriptorWithContent.wordCount // The word count
              title = descriptorWithContent.name // The file name

              dateDif = Date.now() - descriptorWithContent.modtime
              days = Math.floor(dateDif / (86400000)) // The days since modification

              // On ready, show a tooltip with the note contents
              tooltip.setContent(`File Name: ${title}<br>${content}<br>Word Count: ${wordCount}<br> ${days} Days Since Modification`)
            }).catch(err => console.error("File content get error: " + err));
        } else {
          tooltip.setContent(`File not found`)
        }
      }).catch(err => console.error("File path find error: " + err));


  })
}
