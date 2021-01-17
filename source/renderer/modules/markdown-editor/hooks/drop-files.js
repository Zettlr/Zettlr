const path = require('path')
const generateFileLink = require('../../../../common/util/generate-file-link')
const IMAGE_REGEXP = require('../../../../common/regular-expressions').getImageFileRE()

module.exports = (cm) => {
  cm.on('drop', (cm, event) => {
    // If the user has dropped a file from the manager onto the editor,
    // this strongly suggest they want to link it using their preferred method.
    if (event.dataTransfer.getData('text/x-zettlr-file') !== '') {
      let data = JSON.parse(event.dataTransfer.getData('text/x-zettlr-file'))
      let textToInsert = cm.getOption('zettlr').zettelkasten.linkStart
      textToInsert += data.id ? data.id : path.basename(data.path, path.extname(data.path))
      textToInsert += cm.getOption('zettlr').zettelkasten.linkEnd
      let linkPref = global.config.get('zkn.linkWithFilename')
      if (linkPref === 'always' || (linkPref === 'withID' && data.id)) {
        // We need to add the text after the link.
        textToInsert += ' ' + path.basename(data.path)
      }

      // We have to set the cursor to the appropriate coordinates
      let cursor = cm.coordsChar({ top: event.clientY, left: event.clientX })
      cm.setSelection(cursor)
      cm.replaceSelection(textToInsert)
      cm.focus() // Makes working with the text easier
    }

    if (event.dataTransfer.files.length > 0) {
      // In case of files being dropped, do *not* let CodeMirror or the
      // paste-image hook handle them.
      event.codemirrorIgnore = true
      event.stopPropagation()
      event.preventDefault()

      const where = cm.coordsChar({ 'left': event.clientX, 'top': event.clientY })
      cm.setCursor(where)
      const basePath = cm.getOption('zettlr').markdownImageBasePath

      const filesToAdd = []

      for (let file of event.dataTransfer.files) {
        // For each file, generate the link.
        const isImage = IMAGE_REGEXP.test(file.path)
        filesToAdd.push(generateFileLink(file.path, basePath, isImage))
      }

      cm.replaceSelection(filesToAdd.join('\n'))
    } // END: if dataTransfer.files.length
  })
}
