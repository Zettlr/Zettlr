// This script generates a full documentation for the API.

const documentation = require('documentation')
// streamArray and vfs can be used because these are dependencies of documentation.
const streamArray = require('stream-array')
const vfs = require('vinyl-fs')

documentation.build([
  'source/main.js',
  'source/renderer/zettlr-renderer.js'
], {
  config: 'documentation.yml',
  projectName: 'Zettlr',
  projectHomepage: 'https://www.zettlr.com'
})
  .then(comments => documentation.formats.html(comments, {}))
  .then(output => {
    streamArray(output).pipe(vfs.dest('resources/docs'))
    console.log('Done generating API documentation!')
  })
