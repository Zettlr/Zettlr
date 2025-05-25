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
  update (update, _layer) {
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
        // CodeBlock = Generic, four-space-indented code
        // FencedCode = Code explicitly created with backticks
        // CommentBlock = <!----> But without anything preceding the beginning
        // YAMLFrontmatter = A YAML frontmatter
        if (![ 'CodeBlock', 'FencedCode', 'CommentBlock', 'YAMLFrontmatter' ].includes(node.type.name)) {
          return
        }

        try {
          let start = node.from
          let end = node.to

          if (node.type.name === 'FencedCode' || node.type.name === 'YAMLFrontmatter') {
            // For FencedCode and YAMLFrontmatter blocks we want to exclude the
            // first and last lines that contain the delimiters.
            const startLine = view.state.doc.lineAt(node.from).number
            start = view.state.doc.line(startLine + 1).from
            end = view.state.doc.lineAt(node.to).from
          } else if (node.type.name === 'CodeBlock') {
            // For CodeBlocks (which are just the generics produced by an
            // indentation of four spaces) we need to highlight a bit more
            start = view.state.doc.lineAt(node.from).from
            end = view.state.doc.lineAt(node.to).to + 1
          } else if (node.type.name === 'CommentBlock') {
            end = view.state.doc.lineAt(node.to).to + 1
          }

          const localMarkers = RectangleMarker.forRange(
            view,
            'code code-block-line-background',
            EditorSelection.range(start, end)
          )

          // Unfortunately, `RectangleMarker.forRange` has some quirks. In order
          // to get a proper styling, we have to do two things: First, remove
          // zero-width markers (that happen since we include the trailing
          // newline character to ensure that the last marker spans the entire
          // line, and the next line has zero characters to draw a marker for).
          // Then, in a second step, we have to re-create the markers once,
          // passing 'top' and 'bottom' respectively for the first and last
          // marker. This ensures that the borders are properly rounded
          // regardless of how many actual markers this thing produces (which
          // can be either two, for single-line code blocks, or three, for multi
          // line code blocks).
          const markersToAdd: RectangleMarker[] = localMarkers
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

          markers.push(...markersToAdd)
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
  update (update, _layer) {
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
          let start = node.from
          let end = node.to

          if (node.type.name === 'InlineCode') {
            start += 1
            end -= 1
          }

          const localMarkers = RectangleMarker.forRange(
            view,
            'code inline-code-background',
            EditorSelection.range(start, end)
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
    // '.code-block-line-background:nth-child(3n+1)': {
    '.code-block-line-background.top': {
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px'
    },
    // '.code-block-line-background:nth-child(3n+2)': {
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
