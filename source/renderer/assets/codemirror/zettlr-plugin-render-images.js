/* global define CodeMirror Image */
// This plugin renders markdown block images

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('../../../node_modules/codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../../../node_modules/codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  // GENERAL PLUGIN VARIABLES

  // Image detection regex
  var imageRE = /^\s*!\[(.*?)\]\((.+?)\)(?:{.*})?\s*$/
  var protocolRE = /^([a-z]{1,10}):\/\//i

  // Holds the currently rendered images
  var imageMarkers = []
  var currentDocID = null

  const path = require('path')

  // This variable holds a base64 encoded placeholder image.
  var img404 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAYAAADl5PURAAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4ggeDC8lR+xuCgAABkNJREFUeNrt3V2IXGcdx/Hfo2va7oIoiq3mwoJgtLfdFUVj2UDUiiBooWJ9oZRYIVdqz8aAFBHZlPMEYi5WqkGK70aKbyi1iC5VsBeOLzeNpN7Yi4reKglpCHu8yC7IsrvObGYnM7Ofz11yzmTO/p/lm3N2zs6U5eXlLgD70MuMABBAAAEEEEAAAQSYRjM7bLuU5EKSYkzAhOqS3JVkbtAAXjh58uSC+QGT7NSpU39IsjDoJbAzP2AabNsyPwME9i0BBAQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEBBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAgJtuxggm3+rq6qFer2cQo3WlaZoXjEEAucl6vd5SkodMYqT+agQugRkPLxnByF0yAgEEEEAAAQQQQAABBBBAAAEEGANuhN4//pPkVNd1/zaK7ZVSXpHkZJLXmYYAMj0uHz9+/NbZ2dllo9hZrfV5AXQJzJRZWVn5qin0dyJoBAIIIIAAAggggACTz6vA/F+11jcm+UKSTyY58D+bnkzy5aZp/mJKOANk6rRteyzJ35Ic2xS/JLkvyZ9qrd82KQSQqYtfKeXcFuHb/D308bZtv2tiCCDTctl7sJTylX73L6U8UGu9x+QQQKbBI0nmBnzM14wNAWQafGYXj3nL6urqIaNDANmXer3eO00BAWRiXb58+UumgACyL83Ozj6628eura09PcxjqbUu1Fr/ZVUQQEbp/C4e848TJ068OOTj+HmS291riAAySo8lWRvkAV3XfW7IZ3+/SnL7+h8fqLX6+SICyN5rmubPSb43wEMuLi0tfX+I8ftwkqObvld/amUQQEYVwY91XddPBC82TTO021/WX4T5zhabXltr/bGVQQAZiaWlpY8muSfJc1tsvtp13f3DjF+SrKysHEly2zabP9i27dusDMPg3WDo50zwmfXL0oNJ3ptcf7V3/QWP88N8rlrrg0me2Ok/7VLK01YFAWTUIXxxL//9Wut8kl4fu7661rraNM2iVcElMNPiZ0m6Pvc9XGs9bGQIIBOv1vpYkjek/09km0nya5NDABnXqD1Va32ij/2OJvn8Lp7iwPq9giCAjFX8ziW5N8mDtdZfbrff+i0vN/JbHkfbtn2PiSOAjEv8vp7rb6G/4X211t9ste/KysrBJHfcyPOVUtwgjQAyNvH71BabjtRaf7dp3y8meWgIT3vbdoEFAWQk2rZ9ZJv4bTi8EcFa65uTfHaIT3+k1vohq8Ag3AfIsM78Hi6l9POW+IdrrU8l+UaSVw75MH5oJXAGyMjjl8E+D+TeJHtxD99MrfVZK4IAMqr4HUvy+Bgd0jtcCiOA7Lm2bd+f5Fz6v3l5VH509erVb1ohBJC9OvN7dynlJ+N6fGfPnn2TVUIA2ZP4JfltkgNjfJjvqrV+xGohgAzzsvfuJJPy62c/uHbt2jNWDQFkGPG7s5Ty+yS3TMoxnzlzZtbKIYDc6GXvnaWUP05S/NYttG17vxVEANl1/JJcTPKaSTz+Usr5tm3vsJIIIANZW1v7e5JnJ/DMb3MEf2E1EUAGcvr06ZeSvH4KvpS7a62fsKIIIP1e+j5fSjk0RV/St2qtb7WybPBmCGwXv8eTvD39fUjRJHnU6iKA7Khpmk9P6Zc2b3VxCQwIoBEAAggggAACCCCAAAIIIIBMoK5pmn8aQ1/WjGB/cCP0/vGqWuuTSa6MvLxdl1z/3JBu4+9KKeM6p5cn+YBvFwFkutya5L6b8cRjHDtcAgMIIIAAAggggAACCCCAAAIIIOPgFiMYuTkjmHxuhJ4C8/Pzba/Xa01ipK4kecEYBJCbbHFx8eLi4qJBgEtgAAEEEEAAAQQQQAABBAQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEBNAJAAAEEEEAAAQQQQAABBBBAAAEEEEAAAaYggJ3xAFNg25aV5eXl7TZeSnIhSTE/YILjd1eSua02zuzwwLkkC+YH7MdLYAABBBBAAAEEEECAifVfoVk7QcTH/rgAAAAASUVORK5CYII='

  /**
   * Creates a definite absolute URL if the information suffices.
   * @param {string} base The base path to be used
   * @param {string} fragment The URL to be converted, either relative or absolute
   * @returns {string} The converted absolute URL with a cachefree-parameter.
   */
  function makeAbsoluteCachefreeURL (base, fragment) {
    let urlObject
    try {
      // If it's already a correct URL, we are almost done
      urlObject = new URL(fragment)
    } catch (e) {
      // Obviously not a correct URL. In the context of this limited
      // application, we can be sure base is always a path to a Markdown file.
      let resolvedPath = path.resolve(base, fragment)
      if (!protocolRE.test(resolvedPath)) resolvedPath = 'file://' + resolvedPath
      urlObject = new URL(resolvedPath)
    }

    // Now make the thing cachefree
    urlObject.searchParams.append('c', new Date().getTime())
    return urlObject.toString()
  }

  /**
   * Defines the CodeMirror command to render all found markdown images.
   * @param  {CodeMirror} cm The calling CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownRenderImages = function (cm) {
    let i = 0
    let rendered = []

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of imageMarkers) {
        if (marker.find()) marker.clear()
      }
      imageMarkers = [] // Flush it away!
    }

    // First remove images that may not exist anymore. As soon as someone
    // clicks into the image, it will be automatically removed, as well as
    // if someone simply deletes the whole line.
    do {
      if (!imageMarkers[i]) continue

      if (imageMarkers[i] && imageMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        imageMarkers.splice(i, 1)
      } else {
        // Push the marker's actual _line_ (not the index) into the
        // rendered array.
        rendered.push(imageMarkers[i].find().from.line)
        // Array is same size, so increase i
        i++
      }
    } while (i < imageMarkers.length)

    // Now render all potential new images
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
      // Already rendered, so move on
      if (rendered.includes(i)) continue

      // Cursor is in here, so also don't render (for now)
      if (cm.getCursor('from').line === i) continue

      // First get the line and test if the contents contain an image
      let line = cm.getLine(i)
      if (!imageRE.test(line)) continue

      // Extract information from the line
      let match = imageRE.exec(line)
      let caption = match[1]
      let url = match[2]

      // Retrieve lineInfo for line number
      let lineInfo = cm.lineInfo(i)
      let img = new Image()
      // Now add a line widget to this line.
      let textMarker = cm.markText(
        { 'line': lineInfo.line, 'ch': 0 },
        { 'line': lineInfo.line, 'ch': line.length },
        {
          'clearOnEnter': true,
          'replacedWith': img,
          'handleMouseEvents': true
        }
      )

      // Retrieve the size constraints
      let width = (cm.getOption('imagePreviewWidth')) ? cm.getOption('imagePreviewWidth') + '%' : '100%'
      let height = (cm.getOption('imagePreviewHeight') && cm.getOption('imagePreviewHeight') < 100) ? cm.getOption('imagePreviewHeight') + 'vh' : ''
      img.style.maxWidth = width
      img.style.maxHeight = height
      img.style.cursor = 'default' // Nicer cursor
      // Display a replacement image in case the correct one is not found
      img.onerror = (e) => { img.src = img404 }
      img.onclick = (e) => { textMarker.clear() }

      // Update the image caption on load to retrieve the real image size.
      img.onload = () => {
        img.title = `${caption} (${img.naturalWidth}x${img.naturalHeight}px)`
        textMarker.changed()
      }

      // Finally set the src to begin the loading process of the image
      img.src = makeAbsoluteCachefreeURL(cm.getOption('markdownImageBasePath'), url)

      // Finally: Push the textMarker into the array
      imageMarkers.push(textMarker)
    }
  }
})
