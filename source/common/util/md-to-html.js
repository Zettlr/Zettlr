const { Converter } = require('showdown')

// Spin up a showdown converter which can be used across the app
var showdownConverter = new Converter()
showdownConverter.setFlavor('github')
showdownConverter.setOption('strikethrough', true)
showdownConverter.setOption('tables', true)
showdownConverter.setOption('omitExtraWLInCodeBlocks', true)
showdownConverter.setOption('tasklists', true)
showdownConverter.setOption('requireSpaceBeforeHeadingText', true)

module.exports = (markdown) => {
  return showdownConverter.makeHtml(markdown)
}
