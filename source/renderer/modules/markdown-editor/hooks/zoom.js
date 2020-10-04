module.exports = (cm) => {
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
      zoom(cm, isNaN(direction) ? 0 : direction)
    }
  })
}

var fontSize = 100

/**
 * Alter the font size of the editor.
 * @param  {CodeMirror}  cm         The editor instance
 * @param  {Number}      direction  The direction (+1, -1, or 0)
 */
function zoom (cm, direction) {
  if (direction === 0) {
    fontSize = 100
  } else {
    let newSize = fontSize + 10 * direction
    // Constrain the size so it doesn't run into errors
    if (newSize < 30) newSize = 30 // Less than thirty and CodeMirror doesn't display the text anymore.
    if (newSize > 400) newSize = 400 // More than 400 and you'll run into problems concerning headings 1
    fontSize = newSize
  }
  cm.getWrapperElement().style.fontSize = fontSize + '%'
  cm.refresh()
}
