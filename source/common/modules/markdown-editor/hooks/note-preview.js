const tippy = require('tippy.js').default
const { ipcRenderer } = require('electron')

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

    // Initialise displayed attributes to 'loading'
    let title = 'null'
    let content = 'null'
    let wordCount = 'null'
    let time = 'null'
    // Create a tippy. This will display the loading values
    let tooltip = tippy(a, {
      content: 'Searching For File...',
      allowHTML: true, // Obviously
      interactive: true,
      placement: 'top-start', // Display at the beginning of the anchor
      appendTo: document.body, // anchor
      showOnCreate: true, // Immediately show the tooltip
      arrow: false, // No arrow for these tooltips
      onHidden(instance) {
        instance.destroy() // Destroy the tippy instance.
      }
    })

    // Find the file's absolute path
    ipcRenderer.invoke('application', { command: 'file-find-and-return', payload: a.innerText })
      .then((descriptorWithContent) => {
        // If the file is found
        if (descriptorWithContent !== null) {
          // Retrieve the file contets
          // Remove html from content so html is displayed normally. (delete html tags)
          descriptorWithContent.content = descriptorWithContent.content.replace(/(<([^>]+)>)/gi, '')

          // Get the contents of the file such as:
          // 4 lines of 50
          for (i = 0; i < 4; i++) {
            content = descriptorWithContent.content.substring(0 * i, 50 * i)
            if (descriptorWithContent.content.length > 50 * i) {
              content += '\n'
            } else {
              break
            }
          }
          if (content.length > 200) {
            content += '...'
          }
          wordCount = descriptorWithContent.wordCount // The word count
          title = descriptorWithContent.name // The file name

          let dateDif = Date.now() - descriptorWithContent.modtime
          time = (dateDif / (60000)) // The time since modification
          if (time > 1440) {
            time = Math.floor(time / 1440) + ' Day'
            if (time !== '1 Day') {
              time += 's'
            }
          } else if (time > 60) {
            time = Math.floor(time / 60) + ' Hour'
            if (time !== '1 Hour') {
              time += 's'
            }
          } else {
            time = Math.floor(time) + ' Minute'
            if (time !== '1 Minute') {
              time += 's'
            }
          }

          // On ready, show a tooltip with the note contents
          tooltip.setContent(`File Name: "${title}"<br>"${content}"<br>Word Count: ${wordCount}<br> ${time} Since Modification`)
        } else {
          tooltip.setContent('File Not Found') // TODO: Translate!
        }
      }).catch(err => console.error('File path find error: ' + err))
  })
}
