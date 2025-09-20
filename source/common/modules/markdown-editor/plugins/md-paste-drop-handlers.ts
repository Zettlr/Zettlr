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
import { pathBasename, pathDirname, pathExtname, relativePath } from '@common/util/renderer-path-polyfill'
import { type SaveImageFromClipboardAPI } from 'source/app/service-providers/commands/save-image-from-clipboard'
import { hasMdOrCodeExt } from '@common/util/file-extention-checks'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

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
  const relative = relativePath(basePath, p)
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
 * @param   {File}             file      The image object
 *
 * @return  {Promise<string>}            Resolves with the image tag or undefined.
 */
async function saveImageFromClipboard (basePath: string, file: File): Promise<string|undefined> {
  const imageData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    // Hook event listeners
    reader.addEventListener('abort', () => reject(new Error('Image read was aborted')))
    reader.addEventListener('error', () => reject(new Error('Could not read image data')))
    reader.addEventListener('load', () => resolve(reader.result as string))

    // Start loading (as a data URL)
    reader.readAsDataURL(file)
  })

  const pathToInsert: string|undefined = await ipcRenderer.invoke('application', {
    command: 'save-image-from-clipboard',
    payload: { basePath, imageData, imageName: file.name } as SaveImageFromClipboardAPI
  })

  // If the user aborts the pasting process, the command will return
  // undefined, so we have to check for this.
  if (pathToInsert !== undefined) {
    const p = normalizePathForInsertion(pathToInsert, basePath)
    const tag = `![${pathBasename(p)}](${p})`
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
    if (data === null || (data.types.length === 1 && data.types[0] === 'text/plain')) {
      return false // Let the default handler take over
    }

    // Now that we have proper clipboardData to access, we have to determine if
    // this is an image or a text call. Here, we have a set of problems.
    //
    // 1. OS images (and other files) will be represented as file items, so
    //    data.types only includes "Files"
    // 2. Firefox and Chrome will, if the user copies an image, have both the
    //    type "Files" and "text/html", the latter of which often includes the
    //    URL or the image data as a string.
    // 3. Microsoft Office is a POS and will just write EVERYTHING to the
    //    clipboard, i.e. "text/plain", "text/html", "text/rtf", and "image/png"
    // 4. LibreOffice will also write plain, HTML, and RTF, but no image.
    //
    // In effect, we cannot rely on the presence of a "Files" type in the
    // clipboard data to tell us whether we should initiate a paste image or
    // paste text action.
    //
    // BUT, what I found out is that whenever the intention is to paste text,
    // and an image only serves as a fallback, there will be "text/plain" in the
    // clipboard. In other words, as long as there is "text/plain" in the
    // clipboard, the user intends to paste text, not an image.

    const textIntention = data.types.includes('text/plain')
    const basePath = pathDirname(view.state.field(configField).metadata.path)

    const insertions: string[] = []
    const allPromises: Array<Promise<void>> = []
    if (textIntention && data.types.includes('text/html')) {
      // The user intends to paste text, and there is formatted HTML in the
      // clipboard that we need to turn into HTML.
      const html = data.getData('text/html')
      const { boldFormatting, italicFormatting } = view.state.field(configField)
      const emphasis = italicFormatting
      const strong = boldFormatting.includes('*') ? '*' : '_'
      const promise = html2md(html, true, { emphasis, strong })
        .then(md => {
          insertions.push(md)
        })
        .catch(err => {
          console.error(err)
          // On error, fall back to the plain text
          insertions.push(data.getData('text/plain'))
        })
      allPromises.push(promise)
    } else if (textIntention) {
      // The user intends to paste text, but there's only plain text in the
      // clipboard.
      const text = data.getData('text/plain')
      insertions.push(text)
    } else {
      // The user intends to paste an image or a series of files
      for (const file of data.files) {
        if (imageRE.test(file.name)) {
          const filePath = window.getPathForFile(file)
          if (filePath === undefined) {
            // This image resides only within the clipboard, so prompt the user
            // to save it down. The command will already wrap everything into
            // `![]()`.
            allPromises.push(new Promise((resolve, reject) => {
              saveImageFromClipboard(basePath, file)
                .then(tag => {
                  if (tag !== undefined) {
                    insertions.push(tag)
                  }
                  resolve()
                })
                .catch(err => reject(err))
            }))
          } else {
            // The file object points to an existing image on disk, so we can
            // directly insert a (relative) path to the image
            insertions.push(`![${file.name}](${relativePath(basePath, filePath)})`)
          }
        } else {
          // Unsupported file type
        }
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

    if (dataTransfer.getData('zettlr/document-tab') !== '') {
      return false // There's a document being dragged, let the MainEditor capture the event
    }

    const zettlrFile = dataTransfer.getData('text/x-zettlr-file')

    if (dataTransfer.files.length === 0 && zettlrFile === '') {
      return false
    }

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) {
      return false
    }

    event.preventDefault()
    event.stopPropagation()

    const cwd = pathDirname(view.state.field(configField).metadata.path)

    // First: Do we have a fileList of files to drop here?
    if (dataTransfer.files.length > 0) {
      const allPromises: Promise<void>[] = []
      const insertions: string[] = []
      // We have a list of files being dropped onto the editor --> handle them
      for (const file of dataTransfer.files) {
        const filePath = window.getPathForFile(file)
        const isImage = imageRE.test(file.name)

        if (isImage && filePath !== undefined) {
          // The image resides somewhere on disk -> directly insert
          insertions.push(`![${file.name}](${relativePath(cwd, filePath)})`)
        } else if (isImage && filePath === undefined) {
          // It's an image --> offer to save
          allPromises.push(new Promise((resolve, reject) => {
            saveImageFromClipboard(cwd, file)
              .then(tag => {
                if (tag !== undefined) {
                  insertions.push(tag)
                }
                resolve()
              })
              .catch(err => reject(err))
          }))
        } else if (hasMdOrCodeExt(file.name) && filePath !== undefined) {
          // It's a Markdown or supported code file -> tell main to open them
          ipcRenderer.invoke('documents-provider', {
            command: 'open-file',
            payload: {
              path: filePath,
              newTab: true
            }
          } as DocumentManagerIPCAPI)
            .catch(e => console.error(e))
        } else {
          // Unsupported file type -> ignore
        }
      }

      Promise.allSettled(allPromises).then(() => {
        view.dispatch({ changes: { from: pos, insert: insertions.join('\n') } })
      }).catch(err => console.error(err))

      return true
    } else if (zettlrFile !== '') {
      // We have a Markdown/Code file to insert
      const data = JSON.parse(zettlrFile) as { type: 'code'|'file'|'directory'|'other', path: string, id?: string }
      const name = pathBasename(data.path, pathExtname(data.path))
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
