import TableEditor from './index'

export type ColAlignment = 'center'|'left'|'right'

export interface ParsedTable {
  ast: string[][]
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
  onBlur?: (instance: ReturnType<typeof TableEditor>) => void
  /**
   * A callback that is fired whenever the TableEditor's contents change
   *
   * @param   {TableEditor}  instance  The TableEditor instance
   */
  onChange?: (instance: ReturnType<typeof TableEditor>) => void
  /**
   * A callback that is fired whenever the user switches the cell of the table
   *
   * @param   {TableEditor}  instance     The TableEditor instance
   */
  onCellChange?: (instance: ReturnType<typeof TableEditor>) => void
}
