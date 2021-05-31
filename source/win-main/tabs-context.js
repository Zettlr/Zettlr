/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        displayTabsContext
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function displays a document-tabs-specific context menu.
 *
 * END HEADER
 */

// const { trans } = require('../common/i18n-renderer')

module.exports = function displayTabsContext (event, callback) {
  // TODO: Translate all these items!
  let items = [
    {
      label: 'Close',
      id: 'close-this',
      type: 'normal',
      enabled: true
    },
    {
      label: 'Close Others',
      id: 'close-others',
      type: 'normal',
      enabled: true
    },
    {
      label: 'Close All',
      id: 'close-all',
      type: 'normal',
      enabled: true
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  global.menuProvider.show(point, items, (clickedID) => {
    callback(clickedID) // TODO
  })
}
