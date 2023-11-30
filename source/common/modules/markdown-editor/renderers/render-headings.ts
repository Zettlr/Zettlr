/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        HeadingRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer can display and pre-render headings.
 *
 * END HEADER
 */

import { renderInlineWidgets } from './base-renderer'
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { WidgetType, EditorView } from '@codemirror/view'
import { type EditorState } from '@codemirror/state'

import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import type { AnyMenuItem } from '@dts/renderer/context'
import { applyH1, applyH2, applyH3, applyH4, applyH5, applyH6 } from '../commands/markdown'
import clickAndSelect from './click-and-select'

/**
 * Displays a context menu at the given coordinates, for the given node inside
 * the given view.
 *
 * @param   {EditorView}                view    The view
 * @param   {number}                    level   The level of the heading
 * @param   {{ x: number, y: number }}  coords  The position
 */
export function headingMenu (view: EditorView, level: number, coords: { x: number, y: number }): void {
  const tpl: AnyMenuItem[] = [
    {
      id: '1',
      label: '#',
      type: 'checkbox',
      enabled: true,
      checked: level === 1
    },
    {
      id: '2',
      label: '##',
      type: 'checkbox',
      enabled: true,
      checked: level === 2
    },
    {
      id: '3',
      label: '###',
      type: 'checkbox',
      enabled: true,
      checked: level === 3
    },
    {
      id: '4',
      label: '####',
      type: 'checkbox',
      enabled: true,
      checked: level === 4
    },
    {
      id: '5',
      label: '#####',
      type: 'checkbox',
      enabled: true,
      checked: level === 5
    },
    {
      id: '6',
      label: '######',
      type: 'checkbox',
      enabled: true,
      checked: level === 6
    }
  ]

  showPopupMenu(coords, tpl, (clickedID) => {
    if (clickedID === String(level)) {
      // Nothing to do
    } else if (clickedID === '1') {
      applyH1(view)
    } else if (clickedID === '2') {
      applyH2(view)
    } else if (clickedID === '3') {
      applyH3(view)
    } else if (clickedID === '4') {
      applyH4(view)
    } else if (clickedID === '5') {
      applyH5(view)
    } else if (clickedID === '6') {
      applyH6(view)
    }
  })
}

class HeadingTagWidget extends WidgetType {
  constructor (readonly level: number, readonly node: SyntaxNode) {
    super()
  }

  eq (other: HeadingTagWidget): boolean {
    return other.level === this.level &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('div')
    elem.classList.add('heading-tag')
    const span = document.createElement('span')
    span.textContent = `h${this.level}`
    elem.appendChild(span)
    elem.addEventListener('contextmenu', e => {
      headingMenu(view, this.level, { x: e.clientX, y: e.clientY })
    })
    elem.addEventListener('click', clickAndSelect(view))
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return event instanceof MouseEvent
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name.startsWith('HeaderMark')
}

function createWidget (state: EditorState, node: SyntaxNodeRef): HeadingTagWidget|undefined {
  // For now we only support ATX headings, BUT in the future thanks to the fact
  // that Setext headings are also marked, we could definitely make that much
  // nicer as well
  if (!state.sliceDoc(node.from, node.to).includes('#')) {
    return undefined
  }

  // Somehow the parser also detects rogue # signs as heading marks
  const startOfLine = state.doc.lineAt(node.from).from === node.from
  if (!startOfLine) {
    return undefined
  }

  return new HeadingTagWidget(node.to - node.from, node.node)
}

export const renderHeadings = [
  renderInlineWidgets(shouldHandleNode, createWidget),
  EditorView.baseTheme({
    '.heading-tag': {
      color: 'var(--grey-1)',
      transition: '0.2s all ease'
    },
    '.heading-tag:hover': {
      color: 'var(--grey-3)',
      backgroundColor: 'var(--grey-1)'
    }
  })
]
