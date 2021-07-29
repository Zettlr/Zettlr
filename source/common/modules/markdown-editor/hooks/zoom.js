/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror zoom hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables the user to zoom the editor using the mouse wheel
 *
 * END HEADER
 */

module.exports = (cm, zoomHook) => {
  cm.getWrapperElement().addEventListener('wheel', (e) => {
    if (cm.getOption('zettlr').scrollZoom !== true) {
      return
    }

    if (
      (process.platform !== 'darwin' && e.ctrlKey === true) ||
      (process.platform === 'darwin' && e.metaKey === true)
    ) {
      // Did you know that pinching events get reported
      // as "wheel" events as well? Me neither.

      // Divide by itself as absolute to either get -1 or +1
      let direction = e.deltaY / Math.abs(e.deltaY)
      zoomHook(isNaN(direction) ? 0 : direction)
    }
  }, { passive: true })
}
