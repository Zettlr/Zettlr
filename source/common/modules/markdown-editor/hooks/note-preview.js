const tippy = require('tippy.js').default
const { ipcRenderer } = require('electron')
const { DateTime } = require('luxon')

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

          // date_dif = DateTime.fromMillis((DateTime.local().toMillis - descriptorWithContent.modtime))
          date_dif = DateTime.fromMillis(descriptorWithContent.modtime).diffNow(['days', 'hours', 'minutes', 'seconds']).toObject()

          if (date_dif['days'] * -1 >= 1) {
            time = Math.floor(date_dif['days']* -1) + ' Day'
            if (date_dif['days'] * -1 > 1) {
              time += 's'
            }
            time += ' ago'
          } else if (date_dif['hours'] * -1 >= 1) {
            time = Math.floor(date_dif['hours']* -1) + ' Hour'
            if (date_dif['hours'] * -1 > 1) {
              time += 's'
            }
            time += ' ago'
          } else if (date_dif['minutes'] * -1 >= 1) {
            time = Math.floor(date_dif['minutes']* -1) + ' Minute'
            if (date_dif['minutes'] * -1 > 1) {
              time += 's'
            }
            time += ' ago'
          } else {
            time = 'Just Now'
          }

          // On ready, show a tooltip with the note contents
          tooltip.setContent(`File Name: "${title}"<br>"${content}"<br>Word Count: ${wordCount}<br> Modified: ${time}`)
        } else {
          tooltip.setContent('File Not Found') // TODO: Translate!
        }
      }).catch(err => console.error('File path find error: ' + err))
  })
}
