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

import { renderInlineWidgets } from './base-renderer'
import { type SyntaxNode, type SyntaxNodeRef } from '@lezer/common'
import { WidgetType, type EditorView } from '@codemirror/view'
import { type EditorState } from '@codemirror/state'
import { configField } from '../util/configuration'
import makeValidUri from '@common/util/make-valid-uri'
import { linkImageMenu } from '../context-menu/link-image-menu'
import { trans } from '@common/i18n-renderer'
import clickAndSelect from './click-and-select'
import { pathDirname } from '@common/util/renderer-path-polyfill'

// This variable holds a base64 encoded placeholder image.
const img404 = 'data:image/png;base64,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'

class ImageWidget extends WidgetType {
  constructor (readonly node: SyntaxNode, readonly imageTitle: string, readonly imageUrl: string, readonly altText: string, readonly data: string) {
    super()
  }

  eq (other: ImageWidget): boolean {
    return other.imageTitle === this.imageTitle && other.imageUrl === this.imageUrl
  }

  toDOM (view: EditorView): HTMLElement {
    const img = document.createElement('img')
    img.alt = this.altText

    const decodedUrl = this.imageUrl

    const absPath = view.state.field(configField).metadata.path
    const basePath = pathDirname(absPath)
    let isDataUrl = /^data:[a-zA-Z0-9/;=]+(?:;base64){0,1},.+/.test(decodedUrl)
    const actualURLToLoad = isDataUrl ? decodedUrl : makeValidUri(decodedUrl, basePath)

    img.src = actualURLToLoad

    const caption = document.createElement('figcaption')
    caption.textContent = this.imageTitle
    caption.contentEditable = 'true'

    const size = document.createElement('span')
    size.classList.add('image-size-info')

    const openExternally = document.createElement('span')
    openExternally.classList.add('open-externally-button')
    openExternally.setAttribute('title', trans('Open image externally'))
    openExternally.onclick = function (event) {
      event.stopPropagation()
      // NOTE: We can only do this because the main process prevents any
      // navigation, and will open the "URL" using the shell.
      window.location.assign(actualURLToLoad)
    }

    const openIcon = document.createElement('cds-icon')
    openIcon.setAttribute('shape', 'pop-out')
    openExternally.appendChild(openIcon)

    const figure = document.createElement('figure')
    figure.appendChild(img)
    figure.appendChild(caption)
    figure.appendChild(size)

    const container = document.createElement('div')
    container.classList.add('editor-image-container')
    container.appendChild(figure)

    // Retrieve the size constraints
    const { imagePreviewHeight, imagePreviewWidth } = view.state.field(configField)
    const width = (!Number.isNaN(imagePreviewWidth)) ? `${imagePreviewWidth}%` : '100%'
    const height = (!Number.isNaN(imagePreviewHeight) && imagePreviewHeight < 100) ? `${imagePreviewHeight}vh` : ''

    // Apply the constraints
    img.style.maxWidth = width
    img.style.maxHeight = height

    // Display a replacement image in case the correct one is not found
    img.onerror = () => {
      img.src = img404
      isDataUrl = true
      caption.textContent = trans('Image not found: %s', decodedUrl)
      caption.contentEditable = 'false'
    }

    // Update the image title on load to retrieve the real image size.
    img.onload = () => {
      img.title = `${this.imageTitle} (${img.naturalWidth}x${img.naturalHeight}px)`
      size.innerHTML = `${img.naturalWidth}&times;${img.naturalHeight}`

      if (!isDataUrl) {
        figure.appendChild(openExternally)
      }
    }

    const { from, to } = this.node
    const data = this.data

    // Define a quick inline function that takes care of applying a new caption
    const updateCaptionFunction = function (event: KeyboardEvent|FocusEvent): void {
      if (event instanceof KeyboardEvent && event.key !== 'Enter') {
        // If this is a KeyboardEvent, only perform the action on Enter
        return
      }

      event.preventDefault()
      event.stopPropagation()
      // Make sure there are no quotes since these will break the image
      const newCaption = caption.textContent?.replace(/"/g, '') ?? ''
      // "Why are you setting the caption both as the image description and title?"
      // Well, since all exports sometimes us this, sometimes the other value.
      const newImageTag = `![${newCaption}](${decodedUrl} "${newCaption}")${data}`
      // Remove the event listeners beforehand to prevent multiple dispatches
      caption.removeEventListener('keydown', updateCaptionFunction)
      caption.removeEventListener('focusout', updateCaptionFunction)
      view.dispatch({ changes: { from, to, insert: newImageTag } })
    }

    // Should work on these events
    caption.addEventListener('keydown', updateCaptionFunction)
    caption.addEventListener('focusout', updateCaptionFunction)

    container.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      event.stopPropagation()
      linkImageMenu(view, this.node, { x: event.clientX, y: event.clientY })
    })

    container.addEventListener('click', event => {
      if (event.target === img) {
        clickAndSelect(view)(event)
      }
    })

    return container
  }

  ignoreEvent (event: Event): boolean { return true }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name === 'Image'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): ImageWidget|undefined {
  // Get the actual link contents, extract title and URL and create a
  // replacement widget
  const literalImage = state.sliceDoc(node.from, node.to)
  const match = /(?<=\s|^)!\[(.*?)\]\((.+?(?:(?<= )"(.+)")?)\)({[^{]+})?/.exec(literalImage)
  if (match === null) {
    return undefined // Should not happen, but we never know.
  }

  // The image RE will give us the following groups:
  // p1: The alternative text (in square brackets)
  // p2: The complete contents of the round braces
  // p3: If applicable, an image title (within round braces)
  // p4: Anything in curly brackets (mostly commands for Pandoc)
  let altText = match[1] ?? '' // Everything inside the square brackets
  let url = match[2] ?? '' // The URL
  let title = match[3] ?? altText // An optional title in quotes after the image
  let p4 = match[4] ?? ''

  // Remove the "title" from the surrounding URL group, if applicable.
  if (match[3] !== undefined) {
    url = url.replace(`"${match[3]}"`, '').trim()
  }

  return new ImageWidget(node.node, title, url, altText, p4)
}

export const renderImages = renderInlineWidgets(shouldHandleNode, createWidget)
