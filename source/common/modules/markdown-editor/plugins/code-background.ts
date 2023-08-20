import { syntaxTree } from '@codemirror/language'
import { EditorSelection } from '@codemirror/state'
import { layer, RectangleMarker } from '@codemirror/view'

export const codeBackground = layer({
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
        // We also want InlineCode to be handled here.
        if (node.type.name !== 'CodeText' && node.type.name !== 'InlineCode') {
          return
        }
        // Default config for inline code
        let from = node.from + 1
        let to = node.to - 1
        if (node.type.name === 'CodeText') {
          // Branch for Code Block
          from = node.from
          to = node.to + 1 // Necessary to draw a background behind the entire last line
        }
        try {
          const localMarkers = RectangleMarker.forRange(
            view,
            (node.type.name === 'CodeText') ? 'code code-line-background' : 'code inline-code-background',
            EditorSelection.range(from, to)
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
