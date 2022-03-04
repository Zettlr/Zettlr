/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        fontZoom
 * CVM-Role:        Utilitz function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The exported functions from this file are used to create
 *                  callbacks for the menu which allow solely the editor font
 *                  size to be changed by the zoom items
 *
 * END HEADER
 */

function fontZoom (config: ConfigProvider, dir: 'in'|'out'): void {
  const fontSize = config.get('editor.fontSize') as number
  if (dir === 'in') {
    config.set('editor.fontSize', fontSize + 1)
  } else {
    config.set('editor.fontSize', fontSize - 1)
  }
}

export function zoomIn (config: ConfigProvider): () => void {
  return function () {
    fontZoom(config, 'in')
  }
}

export function zoomOut (config: ConfigProvider): () => void {
  return function () {
    fontZoom(config, 'out')
  }
}
