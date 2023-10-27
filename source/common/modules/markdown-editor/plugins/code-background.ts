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
  update (update, layer) {
    return update.docChanged || update.viewportChanged // Return true to redraw markers
  },
  markers (view) {
    // First, collect all code blocks
    const markers: RectangleMarker[] = []
    // Second, create RectangleMarkers for each of them
    syntaxTree(view.state).iterate({
      from: 0,
      to: view.state.doc.length,
      enter: (node) => {
        // CodeText contains a single node that has all the code's contents
        if (![ 'CodeText', 'CommentBlock' ].includes(node.type.name)) {
          return
        }
        try {
          const localMarkers = RectangleMarker.forRange(
            view,
            'code code-block-line-background',
            EditorSelection.range(node.from, node.to + 1)
          )

          markers.push(...localMarkers)
        } catch (err: any) {
          // Sometimes, the RectangleMarker throws an error because it "cannot
          // read properties of null (reading 'top')". The reason seems to be
          // that the corresponding line DOM objects aren't drawn when the
          // plugin attempts to draw the rectangle marker. This is noticeable in
          // a slight flicker of the background. However, to me it seems
          // negligible, and hence we're just swallowing the error.
        }
        return false
      }
    })
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
  update (update, layer) {
    return update.docChanged || update.viewportChanged // Return true to redraw markers
  },
  markers (view) {
    // First, collect all code blocks
    const markers: RectangleMarker[] = []
    // Second, create RectangleMarkers for each of them
    syntaxTree(view.state).iterate({
      from: 0,
      to: view.state.doc.length,
      enter: (node) => {
        if (![ 'InlineCode', 'Comment' ].includes(node.type.name)) {
          return
        }

        // Additional check: Rendering of anything messes with the code
        // backgrounds, so we want to disable them in those cases. Here: inline
        // math.
        if (view.state.sliceDoc(node.from, node.from + 1) === '$') {
          return
        }

        try {
          const localMarkers = RectangleMarker.forRange(
            view,
            'code inline-code-background',
            EditorSelection.range(node.from + 1, node.to - 1)
          )

          markers.push(...localMarkers)
        } catch (err: any) {
          // Sometimes, the RectangleMarker throws an error because it "cannot
          // read properties of null (reading 'top')". The reason seems to be
          // that the corresponding line DOM objects aren't drawn when the
          // plugin attempts to draw the rectangle marker. This is noticeable in
          // a slight flicker of the background. However, to me it seems
          // negligible, and hence we're just swallowing the error.
        }
        return false
      }
    })
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
    // NOTE: Our codeblock layer creates THREE blocks per codeblock:
    // First line, rest of the block, and an empty block at the end.
    // Therefore we have to style elements 1, 4, 7, etc. and 2, 5, 8, etc.
    '.code-block-line-background:nth-child(3n+1)': {
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px'
    },
    '.code-block-line-background:nth-child(3n+2)': {
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
