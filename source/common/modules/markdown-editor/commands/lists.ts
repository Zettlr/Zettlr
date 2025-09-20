/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Lists
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A collection of commands and utility functions for dealing with lists
 *
 * END HEADER
 */

// This plugin handles everything with lists

import { type ChangeSpec, type EditorState, type Transaction } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { indentLess, indentMore, insertTab, moveLineDown, moveLineUp } from '@codemirror/commands'
import { type SyntaxNode } from '@lezer/common'
import { markdownToAST } from '@common/modules/markdown-utils'
import type { BulletList, OrderedList } from '@common/modules/markdown-utils/markdown-ast'

/**
 * Tests if there is any list affected by the current editor selection
 *
 * @param   {EditorState}  state  The state in question
 *
 * @return  {boolean}             Returns true if there is any type of list in
 *                                the current editor selection
 */
function isListTouchedBySelection (state: EditorState): boolean {
  // Then make sure there's anything listy in there.
  let containsList = false
  for (const range of state.selection.ranges) {
    // NOTE: The Markdown mode nests lists under the parent nodes OrderedList
    // and BulletList, so basically I just have to move up the syntaxtree until
    // I either find such a node, or Document (meaning there is no parent)
    syntaxTree(state).iterate({
      from: range.from,
      to: range.to,
      enter (node) {
        if (containsList) {
          return false // Ensure we leave the tree asap
        }

        switch (node.type.name) {
          case 'Document':
            return
          case 'OrderedList':
          case 'BulletList':
            containsList = true
            // falls through
          default:
            return false
        }
      }
    })

    if (containsList) {
      break
    }
  }

  return containsList
}

/**
 * Returns a set of changes required in order to sanitize the given list node.
 *
 * @param   {OrderedList}    listNode  The corresponding AST node
 * @param   {number}         offset    The offset from where this fragment node
 *                                     starts in the full Markdown source
 *
 * @return  {ChangeSpec[]}             A set of changes
 */
function correctOrderedList (listNode: OrderedList, offset: number): ChangeSpec[] {
  const changes: ChangeSpec[] = []

  // NOTE: This code deliberately changes the starting number to 1, regardless
  // of what it was, since this function can also be called from a swap-line
  // command, which may yield a 2 in front of a 1. But I honestly can't think of
  // a way where anyone would want a list to start at something other than 1,
  // and on export the order would be restored anyhow. Should someone complain,
  // we can replace the line below with the commented line at any time.
  // let idx = listNode.startsAt
  let idx = 1
  for (const item of listNode.items) {
    if (item.number !== idx) {
      changes.push({ from: offset + item.marker.from, to: offset + item.marker.to - 1, insert: `${idx}` })
    }

    idx++

    const subLists = item.children.filter(item => item.type === 'OrderedList') as OrderedList[]

    if (subLists.length >= 2) {
      // We have multiple same-level lists, so there is a change in list markers.
      // THE FIRST ITEM DETERMINES THE LIST MARKER!
      const mainList = subLists.shift()!
      for (const list of subLists) {
        if (list.delimiter === mainList.delimiter) {
          continue
        }

        for (const item of list.items) {
          changes.push({ from: offset + item.marker.from, to: offset + item.marker.to, insert: `${idx}${mainList.delimiter}` })
          idx++
        }
      }
    }

    // Check for nested lists
    for (const child of item.children) {
      if (child.type === 'BulletList') {
        changes.push(...correctBulletList(child, offset))
      } else if (child.type === 'OrderedList') {
        changes.push(...correctOrderedList(child, offset))
      }
    }
  }
  return changes
}

/**
 * Returns a set of changes required in order to sanitize the given list node.
 *
 * @param   {BulletList}    listNode  The corresponding AST node
 * @param   {number}        offset    The offset from where this fragment node
 *                                    starts in the full Markdown source
 *
 * @return  {ChangeSpec[]}            A set of changes
 */
function correctBulletList (listNode: BulletList, offset: number): ChangeSpec[] {
  const changes: ChangeSpec[] = []

  // The first list item of the same order determines the overall marker style

  for (const item of listNode.items) {
    const subLists = item.children.filter(item => item.type === 'BulletList') as BulletList[]

    if (subLists.length >= 2) {
      // We have multiple same-level lists, so there is a change in list markers.
      // THE FIRST ITEM DETERMINES THE LIST MARKER!
      const mainList = subLists.shift()!
      for (const list of subLists) {
        if (list.symbol === mainList.symbol) {
          continue
        }

        for (const item of list.items) {
          changes.push({ from: offset + item.marker.from, to: offset + item.marker.to, insert: mainList.symbol })
        }
      }
    }

    // Check for nested lists
    for (const child of item.children) {
      if (child.type === 'BulletList') {
        changes.push(...correctBulletList(child, offset))
      } else if (child.type === 'OrderedList') {
        changes.push(...correctOrderedList(child, offset))
      }
    }
  }

  return changes
}

/**
 * Returns every list that is in any way touched by an editor selection
 *
 * @param   {EditorState[]}  state  The state in question
 *
 * @return  {SyntaxNode[]}          A list of nodes of type OrderedList and BulletList
 */
function fetchLists (state: EditorState): SyntaxNode[] {
  const lists: SyntaxNode[] = []

  for (const range of state.selection.ranges) {
    // NOTE: The Markdown mode nests lists under the parent nodes OrderedList
    // and BulletList, so basically I just have to move up the syntaxtree until
    // I either find such a node, or Document (meaning there is no parent)
    syntaxTree(state).iterate({
      from: range.from,
      to: range.to,
      enter (node) {
        switch (node.type.name) {
          case 'Document':
            return
          case 'OrderedList':
          case 'BulletList':
            lists.push(node.node)
            // falls through
          default:
            return false
        }
      }
    })
  }

  return lists
}

/**
 * A wrapper function that sanitizes all lists that are currently touched by a
 * selection. NOTE: This function and its subroutines will iterate several times
 * over the document's syntax tree, so make sure to only call this when
 * appropriate, e.g. after indenting or unindenting! This function will commit
 * the accumulated changes to the editor automatically, hence no return value.
 *
 * @param   {EditorState}  state  The editor state in question
 */
function correctListMarkers (state: EditorState): Transaction {
  // So what this function needs to do is go over the ranges. We know that this
  // function will only be called after the user either indented or unindented
  // anything that has a list in it.

  const lists = fetchLists(state)
  const changes: ChangeSpec[] = []

  for (const list of lists) {
    const fragment = markdownToAST(state.sliceDoc(list.from, list.to), list.toTree())
    if (fragment.type === 'OrderedList') {
      changes.push(...correctOrderedList(fragment, list.from))
    } else if (fragment.type === 'BulletList') {
      changes.push(...correctBulletList(fragment, list.from))
    }
  }

  // Create a transaction that can be dispatched to the view
  return state.update({ changes })
}

/**
 * A command that inserts a tab when there is no list affected by any selection,
 * or adds an indentation with a following list marker correction for every
 * affected list.
 *
 * @param   {EditorView}  target  The view in question
 *
 * @return  {boolean}             Whether the command has handled the keypress
 */
export function maybeIndentList (target: EditorView): boolean {
  const cmd = {
    state: target.state,
    dispatch: (transaction: Transaction) => target.dispatch(transaction)
  }

  if (isListTouchedBySelection(target.state)) {
    indentMore(cmd)
    target.dispatch(correctListMarkers(target.state))
    return true
  } else {
    return insertTab(cmd)
  }
}

/**
 * A command that removes a tab, and subsequently corrects the list markers for
 * every list affected by this change, if a list was touched by a selection.
 *
 * @param   {EditorView}  target  The view in question
 *
 * @return  {boolean}             Whether the command has handled the keypress
 */
export function maybeUnindentList (target: EditorView): boolean {
  let hasHandled = indentLess({
    state: target.state,
    dispatch: (transaction) => target.dispatch(transaction)
  })

  if (isListTouchedBySelection(target.state)) {
    target.dispatch(correctListMarkers(target.state))
    hasHandled = true
  }

  return hasHandled
}

/**
 * A command that moves a line down, and subsequently corrects the list markers for
 * every list affected by this change, if a list was touched by a selection.
 *
 * @param   {EditorView}  target  The view in question
 *
 * @return  {boolean}             Whether the command has handled the keypress
 */
export function customMoveLineDown (target: EditorView): boolean {
  let hasHandled = moveLineDown({
    state: target.state,
    dispatch: (transaction) => target.dispatch(transaction)
  })

  if (isListTouchedBySelection(target.state)) {
    target.dispatch(correctListMarkers(target.state))
    hasHandled = true
  }

  return hasHandled
}

/**
 * A command that moves a line up, and subsequently corrects the list markers for
 * every list affected by this change, if a list was touched by a selection.
 *
 * @param   {EditorView}  target  The view in question
 *
 * @return  {boolean}             Whether the command has handled the keypress
 */
export function customMoveLineUp (target: EditorView): boolean {
  let hasHandled = moveLineUp({
    state: target.state,
    dispatch: (transaction) => target.dispatch(transaction)
  })

  if (isListTouchedBySelection(target.state)) {
    target.dispatch(correctListMarkers(target.state))
    hasHandled = true
  }

  return hasHandled
}
