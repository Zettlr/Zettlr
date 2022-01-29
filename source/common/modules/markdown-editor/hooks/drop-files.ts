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
import { PlatformPath } from '@dts/renderer/path'

const path: PlatformPath = (window as any).path
const IMAGE_REGEXP = getImageFileRE()

interface XFileObject {
  type: 'directory'|'file'|'code'
  path: string
  id: string
}

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
      const { linkStart, linkEnd } = (cm as any).getOption('zettlr').zettelkasten
      cm.replaceSelection(getInternalLink(data, linkStart, linkEnd, basePath))
    } else if (filePaths.length > 0) {
      // We have an other file to insert. This means to either link them as a
      // (relative) path or an image.
      const filesToAdd = []

      for (const file of filePaths) {
        const relativePath = path.relative(basePath, file)

        if (IMAGE_REGEXP.test(file)) {
          filesToAdd.push(`![${path.basename(file)}](${relativePath})`)
        } else {
          filesToAdd.push(`[${path.basename(file)}](${relativePath})`)
        }
      }

      cm.replaceSelection(filesToAdd.join('\n'))
    }
    cm.focus() // Last but not least, make sure the editor is focused
  })
}

/**
 * Returns an internal link representation of the data object passed, respecting
 * user settings.
 *
 * @param   {XFileObject}  data       The object containing the object data
 * @param   {string}       linkStart  The internal link start string
 * @param   {string}       linkEnd    The internal link end string
 * @param   {string}       basePath   The Markdown base path
 *
 * @return  {string}                  The correct string
 */
function getInternalLink (data: XFileObject, linkStart: string, linkEnd: string, basePath: string): string {
  if (data.type === 'directory') {
    return `[${path.basename(data.path)}](${path.relative(basePath, data.path)})`
  }

  const fnameOnly: boolean = global.config.get('zkn.linkFilenameOnly')

  if (fnameOnly) {
    return `${linkStart}${path.basename(data.path)}${linkEnd}`
  }

  const linkPref: 'always'|'never'|'withID' = global.config.get('zkn.linkWithFilename')

  if (data.id === '' && linkPref !== 'always') {
    return `${linkStart}${path.basename(data.path)}${linkEnd}`
  } else if (data.id === '' && linkPref === 'always') {
    return `${linkStart}${path.basename(data.path)}${linkEnd} ${path.basename(data.path)}`
  } else if (data.id !== '' && linkPref !== 'never') {
    return `${linkStart}${data.id}${linkEnd} ${path.basename(data.path)}`
  } else if (data.id !== '' && linkPref === 'never') {
    return `${linkStart}${data.id}${linkEnd}`
  }

  // Fallback to make the linter happy
  return `${linkStart}${path.basename(data.path)}${linkEnd}`
}
