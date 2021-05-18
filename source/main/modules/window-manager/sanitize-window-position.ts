import { screen } from 'electron'
import { WindowPosition } from './types.d'

/**
 * This helper funnction ensures the passed WindowState object contains only
 * sane values for the current computer display configuration.
 *
 * @param   {WindowState}  conf  The configuration to sanitize
 *
 * @return  {WindowState}        The sanitized configuration
   */
export default function _getSaneWindowPosition (conf: WindowPosition): WindowPosition {
  // First, attempt to find the correct display in this order:
  // 1. The provided lastDisplayId
  // 2. The display that most closely matches the provided bounds
  let saneDisplay = screen.getAllDisplays().find(display => {
    return display.id === conf.lastDisplayId
  })

  if (saneDisplay === undefined) {
    saneDisplay = screen.getDisplayMatching({
      x: conf.left,
      y: conf.top,
      width: conf.width,
      height: conf.height
    })
  }

  // Second, when we know the display, make sure the window bounds are sane
  let saneTop = conf.top
  let saneLeft = conf.left
  let saneWidth = conf.width
  let saneHeight = conf.height

  const screensize = saneDisplay.workArea
  if (conf.isMaximised) {
    // We don't need to check, just set the corresponding bounds
    saneLeft = screensize.x
    saneTop = screensize.y
    saneWidth = screensize.width
    saneHeight = screensize.height
  } else {
    // Ensure sane values
    if (saneWidth > screensize.width) {
      saneWidth = screensize.width
    }

    if (saneHeight > screensize.height) {
      saneHeight = screensize.height
    }

    if (saneLeft + saneWidth > screensize.width) {
      saneLeft = screensize.width - saneWidth
    }

    if (saneTop + saneHeight > screensize.height) {
      saneTop = screensize.height - saneHeight
    }
  }

  // Third, return a safe window position
  return {
    // Use the provided windowType and (if applicable) quicklookFile
    windowType: conf.windowType,
    quicklookFile: conf.quicklookFile,
    // Use the sane values for the rest
    lastDisplayId: saneDisplay.id,
    top: saneTop,
    left: saneLeft,
    width: saneWidth,
    height: saneHeight,
    isMaximised: conf.isMaximised
  }
}
