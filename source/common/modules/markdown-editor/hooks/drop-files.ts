/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror drop-files hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles dropping of data onto the CodeMirror editor.
 *
 * END HEADER
 */

import { getImageFileRE } from '@common/regular-expressions'
import CodeMirror from 'codemirror'
const path = (window as any).path
const IMAGE_REGEXP = getImageFileRE()

export default function dropFilesHook (cm: CodeMirror.Editor): void {
  cm.on('drop', (cm, event) => {
    if (event.dataTransfer === null) {
      return
    }

    const zettlrFile = event.dataTransfer.getData('text/x-zettlr-file')
    const otherFile = event.dataTransfer.getData('text/x-zettlr-other-file')
    const hasFiles = event.dataTransfer.files.length > 0

    if (zettlrFile === '' && otherFile === '' && !hasFiles) {
      return // Nothing we could do here
    }

    // We have something to insert, so in any case prevent CodeMirror from
    // processing the event
    (event as any).codemirrorIgnore = true
    event.stopPropagation()
    event.preventDefault()

    // We have to set the cursor to the appropriate coordinates
    const cursor = cm.coordsChar({ top: event.clientY, left: event.clientX })
    cm.setSelection(cursor)

    const basePath = (cm as any).getOption('zettlr').markdownImageBasePath

    const filePaths = []
    if (otherFile !== '') {
      filePaths.push(otherFile)
    } else if (hasFiles) {
      for (const file of event.dataTransfer.files) {
        filePaths.push(file.path)
      }
    }

    if (zettlrFile !== '') {
      // If the user has dropped a file from the manager onto the editor,
      // this strongly suggest they want to link it using their preferred method.
      const data = JSON.parse(zettlrFile)
      let textToInsert: string = (cm as any).getOption('zettlr').zettelkasten.linkStart
      textToInsert += data.id !== undefined ? String(data.id) : String(path.basename(data.path, path.extname(data.path)))
      textToInsert += (cm as any).getOption('zettlr').zettelkasten.linkEnd as string
      const linkPref = global.config.get('zkn.linkWithFilename')
      if (linkPref === 'always' || (linkPref === 'withID' && data.id !== undefined)) {
        // We need to add the text after the link.
        textToInsert += ' ' + String(path.basename(data.path))
      }

      cm.replaceSelection(textToInsert)
    } else if (filePaths.length > 0) {
      // We have an other file to insert. This means to either link them as a
      // (relative) path or an image.
      const filesToAdd = []

      for (const file of filePaths) {
        const relativePath: string = path.relative(basePath, file)

        if (IMAGE_REGEXP.test(file)) {
          filesToAdd.push(`![${path.basename(file) as string}](${relativePath})`)
        } else {
          filesToAdd.push(`[${path.basename(file) as string}](${relativePath})`)
        }
      }

      cm.replaceSelection(filesToAdd.join('\n'))
    }
    cm.focus() // Last but not least, make sure the editor is focused
  })
}
