/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ImageRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer can display and manage images.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { type SyntaxNode, type SyntaxNodeRef } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { type EditorState } from '@codemirror/state'
import { configField } from '../util/configuration'
import makeValidUri from '@common/util/make-valid-uri'
import { linkImageMenu } from '../context-menu/link-image-menu'
import { trans } from '@common/i18n-renderer'
import clickAndSelect from './click-and-select'
import { pathDirname } from '@common/util/renderer-path-polyfill'
import { syntaxTree } from '@codemirror/language'
import { parseLinkAttributes, type ParsedPandocLinkAttributes } from 'source/common/pandoc-util/parse-link-attributes'

const ipcRenderer = window.ipc

// This variable holds a base64 encoded placeholder image.
const img404 = 'data:image/png;base64,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'

function isDataUrl (url: string): boolean {
  return /^data:[a-zA-Z0-9/;=]+(?:;base64){0,1},.+/.test(url)
}

/**
 * This map is a cache that holds the actual (natural) sizes of the images we
 * have loaded across the app, identified by their absolute paths. These numbers
 * will be updated as images load, and will be used by the image widgets to
 * report a (likely) height which will help CodeMirror render scroll bars etc.
 * much more accurately. NOTE: The image height cache caches the EXACT height of
 * the rendered widget at the time of caching, NOT the natural image's height!
 * Also, this cache will be kept updated whenever an image is reloaded.
 */
const IMAGE_HEIGHT_CACHE = new Map<string, number>()

/**
 * Resolves the actual image URL to load, provided the current file's location.
 *
 * @param   {string}  filePath  The file path
 * @param   {string}  imageUrl  The image URL
 *
 * @return  {string}            The full, absolute path to the image.
 */
function resolveImageUrl (filePath: string, imageUrl: string): string {
  const basePath = pathDirname(filePath)
  return isDataUrl(imageUrl) ? imageUrl : makeValidUri(imageUrl, basePath)
}

class ImageWidget extends WidgetType {
  constructor (
    readonly node: SyntaxNode,
    readonly imageTitle: string,
    readonly imageUrl: string,
    readonly resolvedImageUrl: string,
    readonly altText: string,
    readonly data: ParsedPandocLinkAttributes
  ) {
    super()
  }

  get estimatedHeight (): number {
    return IMAGE_HEIGHT_CACHE.get(this.resolvedImageUrl) ?? -1
  }

  toDOM (view: EditorView): HTMLElement {
    //////////////////////////////////////////
    // FIGURE
    //////////////////////////////////////////
    const figure = document.createElement('figure')
    figure.classList.add('image-preview')

    // Retrieve and apply the size constraints
    const { imagePreviewHeight, imagePreviewWidth } = view.state.field(configField)
    const defaultWidth = (!Number.isNaN(imagePreviewWidth)) ? `${imagePreviewWidth}%` : '100%'
    const defaultHeight = (!Number.isNaN(imagePreviewHeight) && imagePreviewHeight < 100) ? `${imagePreviewHeight}vh` : ''
    figure.style.maxWidth = this.data.width !== undefined ? `min(${this.data.width}, ${defaultWidth})` : defaultWidth
    figure.style.maxHeight = this.data.height !== undefined ? `min(${this.data.height}, ${defaultHeight})` : defaultHeight

    // Display a context menu with the current image node
    figure.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      event.stopPropagation()
      const node = syntaxTree(view.state).resolve(parseInt(img.dataset.from ?? '-1', 10), 1)
      linkImageMenu(view, node, { x: event.clientX, y: event.clientY })
    })

    //////////////////////////////////////////
    // IMG
    //////////////////////////////////////////
    const img = document.createElement('img')
    // This ensures that overly tall images will not be cropped by a too-short
    // figure, and instead scale down. The figure will also become narrower,
    // accommodating only for the total width of the resized image.
    img.style.maxHeight = this.data.width !== undefined ? `min(${this.data.width}, ${defaultWidth})` : defaultWidth
    img.alt = this.altText
    img.title = this.imageTitle

    // Store some crucial information on the node itself
    img.dataset.from = String(this.node.from)
    img.dataset.to = String(this.node.to)
    img.dataset.originalUrl = this.imageUrl
    img.dataset.title = this.imageTitle

    // Select the underlying node
    img.addEventListener('click', event => {
      clickAndSelect(view)(event)
    })

    // Display a replacement image in case the correct one is not found
    img.onerror = () => {
      img.src = img404
      caption.textContent = trans('Image not found: %s', img.dataset.originalUrl)
      caption.contentEditable = 'false'
    }

    // Update the image title on load to retrieve the real image size.
    img.onload = () => {
      img.title = `${img.dataset.title!.replace(/\\"/g, '"')} (${img.naturalWidth}x${img.naturalHeight}px)`
      size.innerHTML = `${img.naturalWidth}&times;${img.naturalHeight}`

      // Determine if the image can be opened externally
      if (isDataUrl(img.dataset.originalUrl!) && figure.contains(openExternally)) {
        figure.removeChild(openExternally)
      } else if (!figure.contains(openExternally)) {
        figure.appendChild(openExternally)
      }

      const { width, height } = figure.getBoundingClientRect()

      // Determine if the image is wide enough to display the surrounding elements
      if (width >= 256 && height >= 128) {
        size.style.display = ''
        caption.style.display = ''
        openExternally.style.display = ''
      } else {
        size.style.display = 'none'
        caption.style.display = 'none'
        openExternally.style.display = 'none'
      }

      // Lastly, cache the image's resolved height. This can quickly become
      // inaccurate, but can be solved by the user with a simple Ctrl+A, which
      // will force-reload everything.
      IMAGE_HEIGHT_CACHE.set(this.resolvedImageUrl, height)
    }

    //////////////////////////////////////////
    // CAPTION
    //////////////////////////////////////////
    const caption = document.createElement('figcaption')
    caption.textContent = this.imageTitle.replace(/\\"/g, '"') // Un-escape title
    caption.contentEditable = 'true'

    // Define a quick inline function that takes care of applying a new caption
    const updateCaptionFunction = function (event: KeyboardEvent|FocusEvent): void {
      if (event instanceof KeyboardEvent && event.key !== 'Enter') {
        // If this is a KeyboardEvent, only perform the action on Enter
        return
      }

      const { from, to, attributes, originalUrl } = img.dataset
      const nodeFrom = parseInt(from ?? '-1', 10)
      const nodeTo = parseInt(to ?? '-1', 10)

      event.preventDefault()
      event.stopPropagation()
      // Escape quotes to prevent breaking of the image
      const newCaption = caption.textContent?.replace(/"/g, '\\"') ?? ''
      // "Why are you setting the caption both as the image description and title?"
      // Well, since all exports sometimes use this, sometimes the other value.
      const newImageTag = `![${newCaption}](${originalUrl} "${newCaption}")${attributes ?? ''}`
      // Remove the event listeners beforehand to prevent multiple dispatches
      caption.removeEventListener('keydown', updateCaptionFunction)
      caption.removeEventListener('focusout', updateCaptionFunction)
      view.dispatch({ changes: { from: nodeFrom, to: nodeTo, insert: newImageTag } })
    }

    // Should work on these events
    caption.addEventListener('keydown', updateCaptionFunction)
    caption.addEventListener('focusout', updateCaptionFunction)

    //////////////////////////////////////////
    // OPEN EXTERNALLY
    //////////////////////////////////////////
    const openExternally = document.createElement('span')
    openExternally.classList.add('open-externally-button')
    openExternally.setAttribute('title', trans('Open image externally'))
    openExternally.onclick = function (event) {
      event.stopPropagation()
      const url = resolveImageUrl(
        view.state.field(configField).metadata.path,
        img.dataset.originalUrl ?? ''
      )

      // Open in Zettlr if wanted. TODO: Maybe move this into the editor config?
      if (window.config.get('files.images.openWith') === 'zettlr') {
        const unencoded = decodeURIComponent(url).substring(12)
        // On Windows, it likes to add a third slash at the beginning (because
        // unlike UNIX, absolute paths start with a letter, not a slash)
        const leadingSlash = unencoded.startsWith('/') && process.platform === 'win32'
        const realPath = leadingSlash ? unencoded.substring(1) : unencoded
        ipcRenderer
          .invoke('documents-provider', { command: 'open-file', payload: { path: realPath } })
          .catch(e => console.error(e))
      } else {
        // NOTE: We can only do this because the main process prevents any
        // navigation, and will open the "URL" using the shell.
        window.location.assign(url)
      }
    }

    const openIcon = document.createElement('cds-icon')
    openIcon.setAttribute('shape', 'pop-out')
    openExternally.appendChild(openIcon)

    //////////////////////////////////////////
    // SIZE
    //////////////////////////////////////////
    const size = document.createElement('span')
    size.classList.add('image-size-info')

    // Finally, construct the DOM tree, start loading the image, and return
    figure.appendChild(img)
    figure.appendChild(caption)
    figure.appendChild(size)

    img.src = resolveImageUrl(view.state.field(configField).metadata.path, this.imageUrl)

    return figure
  }

  updateDOM (dom: HTMLElement, view: EditorView): boolean {
    // We assume a given structure, and if there's something wrong, we just
    // capture the error and return false, indicating that the entire dom has to
    // be rebuilt.
    try {
      // First, update the image itself
      const img = dom.querySelector('img')! as HTMLImageElement
      img.dataset.from = String(this.node.from)
      img.dataset.to = String(this.node.to)
      img.dataset.originalUrl = this.imageUrl

      if (img.dataset.title !== this.imageTitle) {
        img.dataset.title = this.imageTitle
        const caption = dom.querySelector('figcaption')! as HTMLElement
        caption.textContent = this.imageTitle.replace(/\\"/g, '"') // Un-escape title
      }

      const resolvedURL = resolveImageUrl(view.state.field(configField).metadata.path, this.imageUrl)

      if (resolvedURL !== img.src) {
        // The load and onerror handlers will handle this accordingly (and also
        // update the size and title)
        img.src = resolvedURL
      }

      return true
    } catch (err) {
      return false
    }
  }

  ignoreEvent (event: Event): boolean { return true }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name === 'Image'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): ImageWidget|undefined {
  // Get the actual link contents, extract title and URL and create a
  // replacement widget
  const imgSource = state.sliceDoc(node.from, node.to)
  const match = /(?<=\s|^)!\[(.*?)\]\((.+?(?:(?<= )"(.+)")?)\)/.exec(imgSource)
  if (match === null) {
    console.error(`Could not parse image from source: "${imgSource}"`)
    return undefined
  }

  // The image RE will give us the following groups:
  // p1: The alternative text (in square brackets)
  // p2: The complete contents of the round braces
  // p3: If applicable, an image title (within round braces)
  // p4: Anything in curly brackets (mostly commands for Pandoc)
  const altText = match[1] ?? '' // Everything inside the square brackets
  let url = match[2] ?? '' // The URL
  const title = match[3] ?? altText // An optional title in quotes after the image

  // Remove the "title" from the surrounding URL group, if applicable.
  if (match[3] !== undefined) {
    url = url.replace(`"${match[3]}"`, '').trim()
  }

  let data: ParsedPandocLinkAttributes = {}
  const nextSibling = node.node.nextSibling
  if (nextSibling !== null && nextSibling.name === 'PandocAttribute') {
    try {
      const text = state.sliceDoc(nextSibling.from, nextSibling.to)
      data = parseLinkAttributes(text)
    } catch (err) {
      // Silently ignore error
    }
  }

  const resolvedImageSrc = resolveImageUrl(state.field(configField).metadata.path, url)
  return new ImageWidget(node.node, title, url, resolvedImageSrc, altText, data)
}

export const renderImages = [
  EditorView.baseTheme({
    'figure.image-preview': {
      position: 'relative',
      display: 'inline-block',
      textAlign: 'center',
      cursor: 'default',
      textIndent: '0', // Reset the text indent
      // Ensure that very un-proportional images do not overflow (see #5465)
      overflow: 'hidden',
      '& img': {
        display: 'block',
        position: 'relative',
        // The figure will squeeze it if necessary to the user-specified width
        maxWidth: '100%'
      },
      '& :not(img)': { opacity: '0' },
      '&:hover :not(img), &:focus-within :not(img)': { opacity: '1' },
      '& .image-size-info, & figcaption, & .open-externally-button': {
        position: 'absolute',
        transition: '0.2s opacity ease',
        backgroundColor: 'rgba(0, 0, 0, .7)',
        color: 'white',
        fontSize: '12px',
        borderRadius: '6px',
        padding: '10px',
        // If we have images in a list, they will inherit the textIndent applied
        // by CodeMirror, so we have to set it explicitly
        textIndent: '0'
      },
      '& .image-size-info': {
        top: '10px',
        left: '10px'
      },
      '& .open-externally-button': {
        top: '10px',
        right: '10px',
        cursor: 'pointer'
      },
      '& figcaption': {
        bottom: '10px',
        left: '10px',
        right: '10px',
        cursor: 'text', // Captions can be edited
        // Codemirror 6's drawCursor plugin makes the actual cursor transparent,
        // so we have to reset it here for the contenteditables. Same for
        // selection backgrounds.
        caretColor: 'rgb(255, 255, 255)',
        '&::selection': {
          color: 'black',
          // Overwrite the important by the plugin
          backgroundColor: 'rgba(255, 255, 255, 0.8) !important'
        }
      }
    }
  }),
  renderBlockWidgets(shouldHandleNode, createWidget)
]
