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

import type ConfigProvider from '@providers/config'

/**
 * Depending on the direction given, increases or decreases the font size of the
 * editor component
 *
 * @param   {ConfigProvider}  config  The configuration provider
 * @param   {'in'|'out'}      dir     The direction of zoom
 */
function fontZoom (config: ConfigProvider, dir: 'in'|'out'): void {
  const fontSize = config.get('editor.fontSize') as number
  if (dir === 'in') {
    config.set('editor.fontSize', fontSize + 1)
  } else {
    config.set('editor.fontSize', fontSize - 1)
  }
}

/**
 * Returns a function that, when called, increases the editor font size
 *
 * @param   {ConfigProvider}  config  The configuration provider
 *
 * @return  {Function}                A callback
 */
export function zoomIn (config: ConfigProvider): () => void {
  return function () {
    fontZoom(config, 'in')
  }
}

/**
 * Returns a function that, when called, decreases the editor font size
 *
 * @param   {ConfigProvider}  config  The configuration provider
 *
 * @return  {Function}                A callback
 */
export function zoomOut (config: ConfigProvider): () => void {
  return function () {
    fontZoom(config, 'out')
  }
}
