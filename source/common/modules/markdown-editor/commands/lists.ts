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

import { ChangeSpec, EditorState, Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { indentLess, indentMore, insertTab } from '@codemirror/commands'
import { SyntaxNode } from '@lezer/common'

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
 * NOTE: It is your responsibility to ensure only OrderedList nodes are passed
 * into this function!
 *
 * @param   {EditorState}   state  The state for the editor
 * @param   {SyntaxNode}    list   The SyntaxNode of type OrderedList
 *
 * @return  {ChangeSpec[]}         A set of changes
 */
function correctOrderedList (state: EditorState, list: SyntaxNode): ChangeSpec[] {
  const changes: ChangeSpec[] = []

  // The current list item's number
  let current = 1

  let currentChild: SyntaxNode|null = list.firstChild

  if (currentChild === null) {
    return []
  }

  do {
    // Handle the list item
    const marker = currentChild.firstChild
    if (marker?.name === 'ListMark') {
      const mark = state.sliceDoc(marker.from, marker.to)
      const sign = mark.endsWith('.') ? '.' : ')'
      if (parseInt(mark, 10) !== current) {
        changes.push({ from: marker.from, to: marker.to, insert: `${current}${sign}` })
      }
      current++ // Only list items mean we should increment the number.
    }

    // Handle nested lists. These will be children to the current list item
    for (const child of currentChild.getChildren('BulletList')) {
      changes.push(...correctBulletList(state, child))
    }

    for (const child of currentChild.getChildren('OrderedList')) {
      changes.push(...correctOrderedList(state, child))
    }

    currentChild = currentChild.nextSibling
  } while (currentChild !== null)

  return changes
}

/**
 * Returns a set of changes required in order to sanitize the given list node.
 * NOTE: It is your responsibility to ensure only BulletList nodes are passed
 * into this function!
 *
 * @param   {EditorState}   state  The state for the editor
 * @param   {SyntaxNode}    list   The SyntaxNode of type BulletList
 *
 * @return  {ChangeSpec[]}         A set of changes
 */
function correctBulletList (state: EditorState, list: SyntaxNode): ChangeSpec[] {
  const changes: ChangeSpec[] = []

  // First, get the single indentation for this list. Nested lists are a
  // recursive problem, and we have everything we need right here.
  // TODO: There is an indentation service, soooo ... maybe I can use that one?!
  const line = state.doc.lineAt(list.from).text
  const match = /^\s*/.exec(line)
  const indentation = Math.floor((match ?? [''])[0].replace('\t', ' ').length / 4)
  // Indentation determines bullet:
  // * First level gets asterisks
  //     - Second level gets hyphens
  //         + Third level gets plus
  //             * Rinse and repeat
  const which = '*-+'[indentation % 3] // 0 1 2 // TODO: Make user-configurable!

  let currentChild: SyntaxNode|null = list.firstChild

  if (currentChild === null) {
    return []
  }

  do {
    // Handle the next list item
    const marker = currentChild.firstChild
    if (marker?.name === 'ListMark') {
      const mark = state.sliceDoc(marker.from, marker.to)
      if (mark !== which) {
        changes.push({ from: marker.from, to: marker.to, insert: which })
      }
    }

    // Handle nested lists. These will be children to the current list item
    for (const child of currentChild.getChildren('BulletList')) {
      changes.push(...correctBulletList(state, child))
    }

    for (const child of currentChild.getChildren('OrderedList')) {
      changes.push(...correctOrderedList(state, child))
    }

    currentChild = currentChild.nextSibling
  } while (currentChild !== null)

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
  // const lines = getSelectedLines(state)
  const lists = fetchLists(state)
  const changes: ChangeSpec[] = []

  for (const list of lists) {
    if (list.name === 'OrderedList') {
      changes.push(...correctOrderedList(state, list))
    } else if (list.name === 'BulletList') {
      changes.push(...correctBulletList(state, list))
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
