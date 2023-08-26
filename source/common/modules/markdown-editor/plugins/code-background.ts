import { syntaxTree } from '@codemirror/language'
import { EditorSelection, type Extension } from '@codemirror/state'
import { layer, RectangleMarker } from '@codemirror/view'

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
        if (node.type.name !== 'CodeText') {
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
        if (node.type.name !== 'InlineCode') {
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
  inlineCodeBackground
]
