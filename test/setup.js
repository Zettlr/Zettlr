/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Setup the test environment.
 *
 * END HEADER
 */

import { JSDOM } from 'jsdom'
import path from 'path'

/**
 * Emulates a browser environment, which is required for some tests (especially if Vue is involved).
 * Code is essentially taken from https://github.com/enzymejs/enzyme/blob/master/docs/guides/jsdom.md.
 */
function mockBrowser () {
  const jsdom = new JSDOM('<!doctype html><html><body></body></html>')
  const { window } = jsdom

  function copyProps (src, target) {
    Object.defineProperties(target, {
      ...Object.getOwnPropertyDescriptors(src),
      ...Object.getOwnPropertyDescriptors(target)
    })
  }

  // The renderer utilities look for the path module on the window object, so
  // we copy it here in order for those tests not to fail.
  window.path = path

  // Mock the window.config get() and set()
  window.config = {
    _data: new Map(),
    get(key) {
      if (key === undefined) return this._data
      return this._data.get(key)
    },
    set(key, value) {
      this._data.set(key, value)
    }
  }

  // Mock the navigator.clipboard readText() and writeText()
  navigator.clipboard = {
    _data: '',
    readText() { return this._data },
    writeText(text) { this._data = text }
  }

  global.window = window
  global.document = window.document
  global.requestAnimationFrame = function (callback) {
    return setTimeout(callback, 0)
  }
  global.cancelAnimationFrame = function (id) {
    clearTimeout(id)
  }
  copyProps(window, global)
}

mockBrowser()
