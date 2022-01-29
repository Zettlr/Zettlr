/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Generates Markdown tables of the given size
 *
 * END HEADER
 */

/**
* Generates a basic Markdown table of the given size.
* @param  {Number} rows Number of rows
* @param  {Number} cols Number of columns
* @return {String}      The generated table.
*/
export default function (rows: number = 2, cols: number = 2): string {
  let table = ''

  for (let i = 0; i < rows; i++) {
    table += '|'
    for (let k = 0; k < cols; k++) {
      table += '   |'
    }
    table += '\n'
  }
  return table
}
