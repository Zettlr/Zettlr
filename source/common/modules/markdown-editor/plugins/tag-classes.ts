/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TagClassesPlugin
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a small plugin that applies a class of
 *                  the format `cm-zkn-tag-<tagName>` to each visible tag inside
 *                  a Markdown document.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { type Extension, type Range } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate
} from '@codemirror/view'

/**
 * This function returns a decoration set that wraps any found ZknTag with a
 * class that represents it: cm-zkn-tag-<tagName>. NOTE: This is purely
 * aesthetic and the plugin only looks at visible ranges.
 *
 * @param   {EditorView}                view        The view
 * @param   {Map<string, Decoration>}   tagCache    The tagCache for faster lookup
 *
 * @return  {DecorationSet}                         The built set
 */
function retrieveTagClasses (view: EditorView, tagCache: Map<string, Decoration>): DecorationSet {
  const decoRanges: Array<Range<Decoration>> = []
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter (node) {
        if (node.name !== 'ZknTag') {
          return
        }

        const content = node.node.getChild('ZknTagContent')

        if (content === null) {
          return
        }

        // NOTE: Tag content contains the # in the main text
        const tagName = view.state.sliceDoc(content.from + 1, content.to)

        const deco = tagCache.get(tagName) ?? Decoration.mark({ class: `cm-zkn-tag-${tagName}` })
        if (!tagCache.has(tagName)) {
          tagCache.set(tagName, deco)
        }

        decoRanges.push(deco.range(node.from, node.to))
      }
    })
  }

  return Decoration.set(decoRanges, true)
}

const tagClassesPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  tagDecorationCache: Map<string, Decoration>

  constructor (view: EditorView) {
    this.tagDecorationCache = new Map()
    this.decorations = retrieveTagClasses(view, this.tagDecorationCache)
  }

  update (update: ViewUpdate): void {
    this.decorations = retrieveTagClasses(update.view, this.tagDecorationCache)
  }
}, {
  decorations: v => v.decorations
})

export function tagClasses (): Extension[] {
  return [tagClassesPlugin]
}
