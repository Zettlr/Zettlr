/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Base Renderer
 * CVM-Role:        Utility Class
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module defines two base-renderers that are used by all
 *                  rendering plugins. Rendering plugins can either define a
 *                  block renderer or an inline renderer depending on the need.
 *
 * END HEADER
 */

import {
  Decoration,
  EditorView,
  ViewPlugin,
  type WidgetType,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { type SyntaxNodeRef } from '@lezer/common'
import { StateField, type EditorState } from '@codemirror/state'
import { rangeInSelection } from '../util/range-in-selection'

/**
 * Renders all widgets for the provided `visibleRanges`. The function traverses
 * the syntax tree within those ranges, makes sure that there is no selection
 * that overlaps the current node in any way, and afterwards calls
 * `shouldHandleNode`. If that function returns true, this indicates that there
 * is a widget that should be rendered in place of that node. To do so, the
 * function then calls `createWidget` which should return a widget that then
 * gets rendered in place of the node, or undefined if there was some condition
 * that there should be no widget in this node.
 *
 * @param   {EditorState}                   state             The current state
 *                                                            of the editor.
 *                                                            Used to traverse
 *                                                            the syntax tree.
 * @param   {{from: number, to: number}[]}  visibleRanges     The ranges to
 *                                                            render. If an
 *                                                            empty array is
 *                                                            provided, this
 *                                                            means to
 *                                                            (re)render the
 *                                                            full document.
 * @param   {Function}                      shouldHandleNode  A function that
 *                                                            should check the
 *                                                            provided node and
 *                                                            return true if the
 *                                                            node represents a
 *                                                            widget.
 * @param   {Function}                      createWidget      A function that
 *                                                            should create the
 *                                                            widget for that
 *                                                            node.
 *
 * @return  {DecorationSet}                                   A set of rendered
 *                                                            decorations.
 */
function renderWidgets (
  state: EditorState,
  visibleRanges: ReadonlyArray<{ from: number, to: number }>,
  shouldHandleNode: (node: SyntaxNodeRef) => boolean,
  createWidget: (state: EditorState, node: SyntaxNodeRef) => WidgetType|undefined
): DecorationSet {
  const widgets: any[] = [] // TODO: Correct type

  if (visibleRanges.length === 0) {
    // visibleRanges is empty, hence we should (re)process the whole document
    visibleRanges = [{ from: 0, to: state.doc.length }]
  }

  for (const { from, to } of visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        // Determine the number of overlapping selections. If these are non-
        // null, we must not render this widget
        if (rangeInSelection(state, node.from, node.to)) {
          return
        }

        // Then, let the caller decide if they want to handle this node
        if (!shouldHandleNode(node)) {
          return
        }

        // Lastly, create a widget and add it to the array
        const renderedWidget = createWidget(state, node)
        if (renderedWidget === undefined) {
          return // This can happen if an additional condition was false
        }
        // NOTE: We are not setting the property `block` to true if this
        // function is being called from within a block renderer, since
        // Codemirror figures this out by looking at whether there are newlines
        // in the range the widget replaces. This allows block renderers to
        // *also* create inline widgets if necessary. This is helpful especially
        // for the Math renderer, since it handles both inline and block
        // equations and this makes it easier. The only reason we should always
        // use inline renderers wherever possible is since block renderers
        // impose a larger performance penalty.
        const widget = Decoration.replace({
          widget: renderedWidget,
          inclusive: false
        })

        widgets.push(widget.range(node.from, node.to))
      }
    })
  }

  return Decoration.set(widgets)
}

/**
 * Call this function to define a plugin that renders inline widgets based on
 * syntax nodes. Note that this means that you should not use this plugin if you
 * plan to consume nodes that span linebreaks since this will throw an error.
 * Also, if you want to simply define additional syntax, please use the syntax
 * plugin.
 *
 * @param   {Function}    shouldHandleNode  A function that receives a syntax
 *                                          node and should return true if your
 *                                          plugin would like to handle it.
 * @param   {Function}    createWidget      A function that receives the editor
 *                                          state and the syntax node and should
 *                                          return a widget to render in its
 *                                          place.
 *
 * @return  {ViewPlugin}                    The instantiated ViewPlugin
 */
export function renderInlineWidgets (
  shouldHandleNode: (node: SyntaxNodeRef) => boolean,
  createWidget: (state: EditorState, node: SyntaxNodeRef) => WidgetType|undefined
): ViewPlugin<any> {
  const plugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor (view: EditorView) {
      this.decorations = renderWidgets(view.state, view.visibleRanges, shouldHandleNode, createWidget)
    }

    update (update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = renderWidgets(update.view.state, update.view.visibleRanges, shouldHandleNode, createWidget)
      }
    }
  }, {
    decorations: view => view.decorations
  })

  return plugin
}

/**
 * Call this function to define a plugin that renders inline and block widgets
 * based on syntax nodes. Note that this function is in general slower as it
 * will (re)parse the full document, so if you would like to render widgets that
 * are guaranteed to be inline-only, please use `renderInlineWidgets` instead.
 * Also, if you want to simply define additional syntax, please use the syntax
 * plugin.
 *
 * @param   {Function}    shouldHandleNode  A function that receives a syntax
 *                                          node and should return true if your
 *                                          plugin would like to handle it.
 * @param   {Function}    createWidget      A function that receives the editor
 *                                          state and the syntax node and should
 *                                          return a widget to render in its
 *                                          place.
 *
 * @return  {StateField<DecorationSet}      The instantiated StateField
 */
export function renderBlockWidgets (
  shouldHandleNode: (node: SyntaxNodeRef) => boolean,
  createWidget: (state: EditorState, node: SyntaxNodeRef) => WidgetType|undefined
): StateField<DecorationSet> {
  const pluginField = StateField.define<DecorationSet>({
    create (state: EditorState) {
      return renderWidgets(state, [], shouldHandleNode, createWidget)
    },
    update (oldDecoSet, transactions) {
      return renderWidgets(transactions.state, [], shouldHandleNode, createWidget)
    },
    provide: f => EditorView.decorations.from(f)
  })
  return pluginField
}
