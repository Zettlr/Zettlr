/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table Editor types
 * CVM-Role:        Types
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the types used by the TableEditor
 *                  components.
 *
 * END HEADER
 */

import type TableEditor from './table-editor'

export type ColAlignment = 'center'|'left'|'right'

export interface ParsedTable {
  ast: string[][]
  type?: 'grid'|'pipe'
  colAlignments: ColAlignment[]
}

export interface TableEditorOptions {
  /**
   * Describes the container for the Table element (either an Element or a querySelector)
   */
  container?: HTMLElement|string

  /**
   * A callback that is fired whenever the TableEditor is unfocused
   *
   * @param   {TableEditor}  instance  The TableEditor instance
   */
  onBlur?: (instance: TableEditor) => void

  /**
   * A callback that is fired whenever the TableEditor's contents change
   *
   * @param   {TableEditor}  instance  The TableEditor instance
   */
  onChange?: (instance: TableEditor) => void

  /**
   * A callback that is fired whenever the user switches the cell of the table
   *
   * @param   {TableEditor}  instance     The TableEditor instance
   */
  onCellChange?: (instance: TableEditor) => void

  /**
   * When the user clicks on the save button, this callback is called to signal
   * that the user intended to save the table
   *
   * @param   {TableEditor}  instance  The TableEditor instance
   */
  saveIntent?: (instance: TableEditor) => void
}
