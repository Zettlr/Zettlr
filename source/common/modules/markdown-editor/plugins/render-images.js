/* global define CodeMirror */
/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        Image rendering Plugin
  * CVM-Role:        CodeMirror Plugin
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     This plugin renders images in-place.
  *
  * END HEADER
  */

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  // GENERAL PLUGIN VARIABLES
  const { getImageRE } = require('../../../regular-expressions')
  const makeAbsoluteURL = require('../../../util/make-absolute-url')
  const { trans } = require('../../../i18n-renderer')

  // Image detection regex
  const imageRE = getImageRE()

  // This variable holds a base64 encoded placeholder image.
  const img404 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAYAAADl5PURAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4ggeDC8lR+xuCgAABkNJREFUeNrt3V2IXGcdx/Hfo2va7oIoiq3mwoJgtLfdFUVj2UDUiiBooWJ9oZRYIVdqz8aAFBHZlPMEYi5WqkGK70aKbyi1iC5VsBeOLzeNpN7Yi4reKglpCHu8yC7IsrvObGYnM7Ofz11yzmTO/p/lm3N2zs6U5eXlLgD70MuMABBAAAEEEEAAAQSYRjM7bLuU5EKSYkzAhOqS3JVkbtAAXjh58uSC+QGT7NSpU39IsjDoJbAzP2AabNsyPwME9i0BBAQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEBBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAgJtuxggm3+rq6qFer2cQo3WlaZoXjEEAucl6vd5SkodMYqT+agQugRkPLxnByF0yAgEEEEAAAQQQQAABBBBAAAEEGANuhN4//pPkVNd1/zaK7ZVSXpHkZJLXmYYAMj0uHz9+/NbZ2dllo9hZrfV5AXQJzJRZWVn5qin0dyJoBAIIIIAAAggggACTz6vA/F+11jcm+UKSTyY58D+bnkzy5aZp/mJKOANk6rRteyzJ35Ic2xS/JLkvyZ9qrd82KQSQqYtfKeXcFuHb/D308bZtv2tiCCDTctl7sJTylX73L6U8UGu9x+QQQKbBI0nmBnzM14wNAWQafGYXj3nL6urqIaNDANmXer3eO00BAWRiXb58+UumgACyL83Ozj6628eura09PcxjqbUu1Fr/ZVUQQEbp/C4e848TJ068OOTj+HmS291riAAySo8lWRvkAV3XfW7IZ3+/SnL7+h8fqLX6+SICyN5rmubPSb43wEMuLi0tfX+I8ftwkqObvld/amUQQEYVwY91XddPBC82TTO021/WX4T5zhabXltr/bGVQQAZiaWlpY8muSfJc1tsvtp13f3DjF+SrKysHEly2zabP9i27dusDMPg3WDo50zwmfXL0oNJ3ptcf7V3/QWP88N8rlrrg0me2Ok/7VLK01YFAWTUIXxxL//9Wut8kl4fu7661rraNM2iVcElMNPiZ0m6Pvc9XGs9bGQIIBOv1vpYkjek/09km0nya5NDABnXqD1Va32ij/2OJvn8Lp7iwPq9giCAjFX8ziW5N8mDtdZfbrff+i0vN/JbHkfbtn2PiSOAjEv8vp7rb6G/4X211t9ste/KysrBJHfcyPOVUtwgjQAyNvH71BabjtRaf7dp3y8meWgIT3vbdoEFAWQk2rZ9ZJv4bTi8EcFa65uTfHaIT3+k1vohq8Ag3AfIsM78Hi6l9POW+IdrrU8l+UaSVw75MH5oJXAGyMjjl8E+D+TeJHtxD99MrfVZK4IAMqr4HUvy+Bgd0jtcCiOA7Lm2bd+f5Fz6v3l5VH509erVb1ohBJC9OvN7dynlJ+N6fGfPnn2TVUIA2ZP4JfltkgNjfJjvqrV+xGohgAzzsvfuJJPy62c/uHbt2jNWDQFkGPG7s5Ty+yS3TMoxnzlzZtbKIYDc6GXvnaWUP05S/NYttG17vxVEANl1/JJcTPKaSTz+Usr5tm3vsJIIIANZW1v7e5JnJ/DMb3MEf2E1EUAGcvr06ZeSvH4KvpS7a62fsKIIIP1e+j5fSjk0RV/St2qtb7WybPBmCGwXv8eTvD39fUjRJHnU6iKA7Khpmk9P6Zc2b3VxCQwIoBEAAggggAACCCCAAAIIIIBMoK5pmn8aQ1/WjGB/cCP0/vGqWuuTSa6MvLxdl1z/3JBu4+9KKeM6p5cn+YBvFwFkutya5L6b8cRjHDtcAgMIIIAAAggggAACCCCAAAIIIOPgFiMYuTkjmHxuhJ4C8/Pzba/Xa01ipK4kecEYBJCbbHFx8eLi4qJBgEtgAAEEEEAAAQQQQAABBAQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEBNAJAAAEEEEAAAQQQQAABBBBAAAEEEEAAAaYggJ3xAFNg25aV5eXl7TZeSnIhSTE/YILjd1eSua02zuzwwLkkC+YH7MdLYAABBBBAAAEEEECAifVfoVk7QcTH/rgAAAAASUVORK5CYII='

  /**
   * Defines the CodeMirror command to render all found markdown images.
   * @param  {CodeMirror.Editor} cm The calling CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownRenderImages = function (cm) {
    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue

      // Always reset lastIndex property, because test()-ing on regular
      // expressions advance it.
      imageRE.lastIndex = 0

      // First get the line and test if the contents contain an image
      let line = cm.getLine(i)
      if (!imageRE.test(line)) continue

      imageRE.lastIndex = 0 // Necessary because of global flag in RegExp

      let match

      // Run through all links on this line
      while ((match = imageRE.exec(line)) != null) {
        // The image RE will give us the following groups:
        // p1: The alternative text (in square brackets)
        // p2: The complete contents of the round braces
        // p3: If applicable, an image title (within round braces)
        // p4: Anything in curly brackets (mostly commands for Pandoc)
        let altText = match[1] || '' // Everything inside the square brackets
        let url = match[2] || '' // The URL
        let title = match[3] || altText // An optional title in quotes after the image
        let p4 = match[4] || ''

        // If a third group has been captured, we need to extract this from the
        // "bigger" second group again.
        if (match[3] !== undefined) {
          url = url.replace(`"${match[3]}"`, '').trim()
        }

        // Now get the precise beginning of the match and its end
        let curFrom = { 'line': i, 'ch': match.index }
        let curTo = { 'line': i, 'ch': match.index + match[0].length }

        let cur = cm.getCursor('from')
        if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch + 1) {
          // Cursor is in selection: Do not render.
          continue
        }

        // We can only have one marker at any given position at any given time
        if (cm.doc.findMarks(curFrom, curTo).length > 0) continue

        // Do not render if it's inside a comment (in this case the mode will be
        // markdown, but comments shouldn't be included in rendering)
        // Final check to avoid it for as long as possible, as getTokenAt takes
        // considerable time.
        let tokenTypeBegin = cm.getTokenTypeAt(curFrom)
        let tokenTypeEnd = cm.getTokenTypeAt(curTo)
        if ((tokenTypeBegin && tokenTypeBegin.includes('comment')) ||
        (tokenTypeEnd && tokenTypeEnd.includes('comment'))) {
          continue
        }

        const img = new Image()

        const isDataUrl = /^data:[a-zA-Z0-9/;=]+(?:;base64){0,1},.+/.test(url)
        let actualURLToLoad = url

        if (!isDataUrl) {
          actualURLToLoad = makeAbsoluteURL(cm.getOption('zettlr').markdownImageBasePath, url)
        }

        const caption = document.createElement('figcaption')
        caption.textContent = title
        caption.contentEditable = true

        // Define a quick inline function that takes care of applying a new caption
        const updateCaptionFunction = function (event) {
          if (event.key !== undefined && event.key !== 'Enter') {
            // If this is a KeyboardEvent, only perform the action on Enter
            return
          }

          event.preventDefault()
          event.stopPropagation()
          // Make sure there are no quotes since these will break the image
          const newCaption = caption.textContent.replace(/"/g, '')
          // "Why are you setting the caption both as the image description and title?"
          // Well, since all exports sometimes us this, sometimes the other value.
          const newImageTag = `![${newCaption}](${url} "${newCaption}")${p4}`
          // Now replace the underlying image
          cm.replaceRange(newImageTag, curFrom, curTo)
        }

        // Should work on these events
        caption.addEventListener('keydown', updateCaptionFunction)
        caption.addEventListener('focusout', updateCaptionFunction)

        const size = document.createElement('span')
        size.classList.add('image-size-info')

        const openExternally = document.createElement('span')
        openExternally.classList.add('open-externally-button')
        openExternally.textContent = 'Open image externally'
        openExternally.onclick = function (event) {
          // NOTE: We can only do this because the main process prevents any
          // navigation, and hence will capture this and instead open it using the shell.
          window.location.assign(makeAbsoluteURL(cm.getOption('zettlr').markdownImageBasePath, url))
        }

        const figure = document.createElement('figure')
        figure.appendChild(img)
        figure.appendChild(caption)
        figure.appendChild(size)
        if (!isDataUrl) {
          figure.appendChild(openExternally)
        }

        const container = document.createElement('div')
        container.classList.add('editor-image-container')
        container.appendChild(figure)

        // Now add a line widget to this line.
        let textMarker = cm.doc.markText(
          curFrom,
          curTo,
          {
            'clearOnEnter': true,
            'replacedWith': container,
            'handleMouseEvents': false
          }
        )

        // Retrieve the size constraints
        const maxPreviewWidth = Number(cm.getOption('zettlr').imagePreviewWidth)
        const maxPreviewHeight = Number(cm.getOption('zettlr').imagePreviewHeight)
        let width = (!Number.isNaN(maxPreviewWidth)) ? maxPreviewWidth + '%' : '100%'
        let height = (!Number.isNaN(maxPreviewHeight) && maxPreviewHeight < 100) ? maxPreviewHeight + 'vh' : ''

        // Apply the constraints to the figure and image
        figure.style.maxWidth = width
        figure.style.maxHeight = height
        img.style.maxWidth = width
        img.style.maxHeight = height
        img.alt = altText
        // Display a replacement image in case the correct one is not found
        img.onerror = () => {
          img.src = img404
          caption.textContent = trans('system.error.image_not_found', url)
        }
        img.onclick = () => { textMarker.clear() }

        // Update the image title on load to retrieve the real image size.
        img.onload = () => {
          img.title = `${title} (${img.naturalWidth}x${img.naturalHeight}px)`
          size.innerHTML = `${img.naturalWidth}&times;${img.naturalHeight}px`
          textMarker.changed()
        }

        // Finally set the src to begin the loading process of the image
        img.src = actualURLToLoad
      }
    }
  }
})
