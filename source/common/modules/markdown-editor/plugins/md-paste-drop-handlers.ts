/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown Paste and Drop handlers
 * CVM-Role:        CodeMirror Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a few handlers that make the main editor
 *                  react properly to paste and drop events, such as converting
 *                  HTML to Markdown before insertion, or handling image drops.
 *
 * END HEADER
 */

import { type DOMEventHandlers } from '@codemirror/view'
import html2md from '@common/util/html-to-md'
import { configField } from '../util/configuration'

const path = window.path
const ipcRenderer = window.ipc

const imageRE = /\.(?:png|jpe?g|gif|bmp|svg|tiff?)$/i

/**
 * This function normalizes an absolute path in a way that is suitable for the
 * main editor, i.e., it should be easily readable for humans and as short as
 * possible.
 *
 * @param   {string}  p         The path to be normalized
 * @param   {string}  basePath  The base path for turning `p` relative.
 *
 * @return  {string}            The normalized path.
 */
function normalizePathForInsertion (p: string, basePath: string): string {
  const relative = path.relative(basePath, p)
  let sanitizedPath = relative.replace(/\\/g, '/')
  if (!sanitizedPath.startsWith('./') && !sanitizedPath.startsWith('../')) {
    sanitizedPath = './' + sanitizedPath
  }
  return sanitizedPath
}

/**
 * Handles the code required to save an image from the clipboard. It returns the
 * image tag with the image path as soon as the image has been saved to disk.
 *
 * @param   {string}           basePath  The base path for the image
 *
 * @return  {Promise<string>}            Resolves with the image tag or undefined.
 */
async function saveImageFromClipboard (basePath: string): Promise<string|undefined> {
  const pathToInsert = await ipcRenderer.invoke('application', {
    command: 'save-image-from-clipboard',
    payload: { startPath: basePath }
  })

  // If the user aborts the pasting process, the command will return
  // undefined, so we have to check for this.
  if (pathToInsert !== undefined) {
    const p = normalizePathForInsertion(pathToInsert, basePath)
    const tag = `![${path.basename(p)}](${p})`
    return tag
  }
}

/**
 * These handlers hook into the editor and attempt to intercept events that need
 * to be handled in a way different from the standard CodeMirror way.
 */
export const mdPasteDropHandlers: DOMEventHandlers<any> = {
  paste (event, view) {
    const data = event.clipboardData
    if (data === null || (data.files.length === 0 && !data.types.includes('text/html'))) {
      return false // Let the default handler take over
    }

    const hasFiles = data.files.length > 0
    const basePath = path.dirname(view.state.field(configField).metadata.path)

    // Now, there are two instances which we have to intercept. The first
    // one is if there are any files in the buffer. In that case, we need
    // to link them properly. The second one is if there is HTML code in
    // the clipboard. In that case, we need to insert it using its
    // Markdown representation instead (basically "paste with style").

    const insertions: string[] = []
    const allPromises: Array<Promise<void>> = []
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files.item(i)
      if (file === null) {
        continue
      }

      if (imageRE.test(file.name)) {
        if (file.path === '') {
          // This image resides only within the clipboard
          allPromises.push(new Promise((resolve, reject) => {
            saveImageFromClipboard(basePath)
              .then(tag => {
                if (tag !== undefined) {
                  insertions.push(tag)
                  resolve()
                }
              })
              .catch(err => reject(err))
          }))
        } else {
          insertions.push(`![${file.name}](${normalizePathForInsertion(file.path, basePath)})`)
        }
      } else {
        insertions.push(`[${file.name}](${normalizePathForInsertion(file.path, basePath)})`)
      }
    }

    // If there were no files, we can deal with any text in the clipboard.
    if (!hasFiles) {
      for (let i = 0; i < data.items.length; i++) {
        const datum = data.items[i]
        if (datum.kind === 'file') {
          continue // Chromium also adds basic file descriptions here
        }

        if (datum.type !== 'text/html') {
          continue // We only deal with HTML here (for the rest, the default handler can take over)
        }

        allPromises.push(new Promise((resolve, reject) => {
          datum.getAsString(text => {
            html2md(text)
              .then(md => {
                insertions.push(md)
                resolve()
              })
              .catch(err => reject(err))
          })
        }))
      }
    }

    Promise.allSettled(allPromises)
      .then(() => {
        // After all promises have been resolved or rejected, the
        // insertions array will contain everything we have to paste.
        const transaction = view.state.replaceSelection(insertions.join('\n'))
        view.dispatch(transaction)
      })
      .catch(err => console.error(err))

    return true
  },
  drop (event, view) {
    const dataTransfer = event.dataTransfer

    if (dataTransfer === null) {
      return false
    }

    const zettlrFile = dataTransfer.getData('text/x-zettlr-file')
    const docTab = dataTransfer.getData('zettlr/document-tab')

    if (docTab !== '') {
      return false // There's a document being dragged, let the MainEditor capture the event
    }

    if (dataTransfer.files.length === 0 && zettlrFile === '') {
      return false
    }

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) {
      return false
    }

    event.preventDefault()
    event.stopPropagation()

    const cwd = path.dirname(view.state.field(configField).metadata.path)

    // First: Do we have a fileList of files to drop here?
    if (dataTransfer.files.length > 0) {
      const files: string[] = []
      // We have a list of files being dropped onto the editor --> link them
      for (let i = 0; i < dataTransfer.files.length; i++) {
        const file = dataTransfer.files.item(i)
        if (file !== null) {
          files.push(file.path)
        }
      }

      const toInsert = files.map(f => {
        const pathToInsert = normalizePathForInsertion(f, cwd)
        if (imageRE.test(f)) {
          return `![${path.basename(f)}](${pathToInsert})`
        } else {
          return `[${path.basename(f)}](${pathToInsert})`
        }
      })

      view.dispatch({ changes: { from: pos, insert: toInsert.join('\n') } })
      return true
    } else if (zettlrFile !== '') {
      // We have a Markdown/Code file to insert
      const data = JSON.parse(zettlrFile) as { type: 'code'|'file'|'directory'|'other', path: string, id?: string }
      const name = path.basename(data.path, path.extname(data.path))
      const pathToInsert = normalizePathForInsertion(data.path, cwd)
      if (data.type === 'file') {
        // Insert as Zkn link
        view.dispatch({ changes: { from: pos, insert: `[[${name}]]` } })
      } else if (data.type === 'code') {
        // Insert as Md link
        view.dispatch({ changes: { from: pos, insert: `[${name}](${pathToInsert})` } })
      } else if (data.type === 'other') {
        if (imageRE.test(data.path)) {
          view.dispatch({ changes: { from: pos, insert: `![${name}](${pathToInsert})` } })
        } else {
          view.dispatch({ changes: { from: pos, insert: `[${name}](${pathToInsert})` } })
        }
      }
      return true
    }

    return false
  }
}
