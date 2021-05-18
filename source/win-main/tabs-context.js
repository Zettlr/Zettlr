// const { trans } = require('../common/i18n')

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
