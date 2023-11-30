/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        WindowPosition type
 * CVM-Role:        Types
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exports a single interface used by the window
 *                  manager to manage the positions of all windows.
 *
 * END HEADER
 */

/**
 * An interface used to save the last sizes and screens from all windows,
 * if applicable.
 */
export interface WindowPosition {
  // Holds the last unique display ID from the given structure
  lastDisplayId: number
  // The window bounds
  x: number
  y: number
  width: number
  height: number
  // Whether the window was/is maximised (necessary if the display changes to
  // adapt the window bounds)
  isMaximised: boolean
}
