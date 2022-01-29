/**
* @ignore
* BEGIN HEADER
*
* Contains:        Utility function
* CVM-Role:        Utility
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This function takes a table AST and calculates, for each
*                  column, the maximum amount of characters.
*
* END HEADER
*/

/**
 * Calculates the maximum size (characters) of each column of a table AST
 *
 * @param   {string[][]}  ast  The AST
 *
 * @return  {number[]}       The maximum sizes for all columns
 */
export default function calculateColSizes (ast: string[][]): number[] {
  const sizes = []
  for (let col = 0; col < ast[0].length; col++) {
    let colSize = 0
    for (let row = 0; row < ast.length; row++) {
      if (ast[row][col].length > colSize) {
        colSize = ast[row][col].length
      }
    }
    sizes.push(colSize)
  }
  return sizes
}
