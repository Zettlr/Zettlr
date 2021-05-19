const tippy = require('tippy.js').default
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
    let title = 'loading'
    let content = 'loading'
    let wordCount = 'loading'
    let time = 'loading'
    // Create a tippy. This will display the loading values
    let tooltip = tippy(a, {
      content: 'Searching For File...',
      allowHTML: true, // Obviously
      interactive: true,
      placement: 'top-start', // Display at the beginning of the anchor
      appendTo: document.body, // anchor
      showOnCreate: true, // Immediately show the tooltip
      arrow: false, // No arrow for these tooltips
      onHidden (instance) {
        instance.destroy() // Destroy the tippy instance.
      }
    })

    // Find the file's absolute path
    ipcRenderer.invoke('application', { command: 'file-path-find', payload: a.innerText })
      .then((filepath) => {
        // If the file is found
        if (filepath !== 'Not Found') {
          // Retrieve the file contets
          ipcRenderer.invoke('application', { command: 'get-file-contents', payload: filepath })
            .then((descriptorWithContent) => {
              // Remove html from content so html is displayed normally. (delete html tags)
              descriptorWithContent.content = descriptorWithContent.content.replace(/(<([^>]+)>)/gi, '')

              // Get the contents of the file such as:
              // 4 lines of 50
              content = descriptorWithContent.content.substring(0, 50)
              if (descriptorWithContent.content.length >= 50) {
                content += '\n' + descriptorWithContent.content.substring(50, 100)
                if (descriptorWithContent.content.length >= 100) {
                  content += '\n' + descriptorWithContent.content.substring(100, 150)
                  if (descriptorWithContent.content.length >= 150) {
                    content += '\n' + descriptorWithContent.content.substring(150, 200)
                    // Add an elipsis if there is more left
                    if (descriptorWithContent.content.length >= 200) {
                      content += '...'
                    }
                  }
                }
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
            }).catch(err => console.error('File content get error: ' + err))
        } else {
          tooltip.setContent('File Not Found')
        }
      }).catch(err => console.error('File path find error: ' + err))
  })
}
