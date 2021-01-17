module.exports = (cm, zoomHook) => {
  cm.getWrapperElement().addEventListener('wheel', (e) => {
    if (
      (process.platform !== 'darwin' && e.ctrlKey) ||
      (process.platform === 'darwin' && e.metaKey)
    ) {
      // Did you know that pinching events get reported
      // as "wheel" events as well? Me neither.
      e.preventDefault()
      // Divide by itself as absolute to either get -1 or +1
      let direction = e.deltaY / Math.abs(e.deltaY)
      zoomHook(isNaN(direction) ? 0 : direction)
    }
  })
}
