/**
 * An interface used to save the last sizes and screens from all windows,
 * if applicable.
 */
export interface WindowPosition {
  // Currently, only main and quicklook windows retain their state
  windowType: string
  // Holds the last unique display ID from the given structure
  lastDisplayId: number
  // The window bounds
  top: number
  left: number
  width: number
  height: number
  // Whether the window was/is maximised (necessary if the display changes to
  // adapt the window bounds)
  isMaximised: boolean
  [key: string]: any // Optional attributes to store
}
