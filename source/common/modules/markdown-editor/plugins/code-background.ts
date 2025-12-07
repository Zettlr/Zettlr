import { syntaxTree } from '@codemirror/language'
import { EditorSelection, type Extension } from '@codemirror/state'
import { EditorView, layer, RectangleMarker } from '@codemirror/view'

/**
 * A layer that renders a code background for both code blocks and block comments
 *
 * @return  {Extension}  A CodeMirror extension
 */
export const codeblockBackground = layer({
  above: false, // Render below text
  class: 'cm-codeBackgroundLayer',
  update (update) {
    return update.docChanged || update.viewportChanged // Return true to redraw markers
  },
  markers (view) {
    const markers: RectangleMarker[] = []

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (![ 'CodeText', 'CommentBlock' ].includes(node.name)) {
            return
          }

          let start = node.from
          let end = node.to

          if (node.name === 'CodeText') {
            start = view.state.doc.lineAt(node.from).from
            end = view.state.doc.lineAt(node.to).to + 1
          }

          // In order to get a proper styling, we have to do two things:
          // First, remove zero-width markers (that happen since we include
          // the trailing newline character to ensure that the last marker
          // spans the entire line, and the next line has zero characters to
          // draw a marker for).
          // Second, we have to re-create the markers, adding 'top' and 'bottom'
          // respectively for the first and last marker so that we can
          // appropriately apply rounded corners
          const localMarkers = RectangleMarker.forRange(
            view,
            'code-block-line-background',
            EditorSelection.range(start, end)
          )
            .filter(marker => {
              return marker.width !== null && marker.width > 0
            })
            .map((marker, i, arr) => {
              const { top, left, width, height } = marker
              const classes = [ 'code', 'code-block-line-background' ]

              if (i === 0) {
                classes.push('top')
              }

              if (i === arr.length - 1) {
                classes.push('bottom')
              }

              return new RectangleMarker(classes.join(' '), left, top, width, height)
            })

          markers.push(...localMarkers)
          return false
        }
      })
    }

    // Third, return
    return markers
  }
})

/**
 * An extension that renders backgrounds for inline code and inline comments.
 *
 * @return  {Extension}  A CodeMirror extension
 */
export const inlineCodeBackground = layer({
  above: false, // Render below text
  class: 'cm-inlineCodeBackgroundLayer',
  update (update) {
    return update.docChanged || update.viewportChanged // Return true to redraw markers
  },
  markers (view) {
    const markers: RectangleMarker[] = []

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (![ 'InlineCode', 'Comment' ].includes(node.name)) {
            return
          }

          // Additional check: Rendering of anything messes with the code
          // backgrounds, so we want to disable them in those cases. Here: inline
          // math.
          if (view.state.sliceDoc(node.from, node.from + 1) === '$') {
            return false
          }

          let start = node.from
          let end = node.to

          if (node.name === 'InlineCode') {
            start += 1
            end -= 1
          }

          const localMarkers = RectangleMarker.forRange(
            view,
            'inline-code-background',
            EditorSelection.range(start, end)
          )

          markers.push(...localMarkers)
          return false
        }
      })
    }
    // Third, return
    return markers
  }
})

export const backgroundLayers: Extension[] = [
  codeblockBackground,
  inlineCodeBackground,
  EditorView.baseTheme({
    '.inline-code-background': {
      borderRadius: '2px',
      padding: '0 2px'
    },
    '.code-block-line-background.top': {
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px'
    },
    '.code-block-line-background.bottom': {
      borderBottomLeftRadius: '4px',
      borderBottomRightRadius: '4px'
    },
    // Colors
    '.inline-code-background, .code-block-line-background': {
      backgroundColor: 'var(--grey-0)'
    },
    '&dark .inline-code-background, &dark .code-block-line-background': {
      backgroundColor: 'var(--grey-4)'
    }
  })
]
