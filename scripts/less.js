// This script generates both main.css and Gettlr-theme.css.
// Run with `npm run less`

const less = require('less')
const fs = require('fs')
const path = require('path')
const log = require('./console-colour.js')
const csso = require('csso')

log.info('Starting LESS compiler ...')

log.info(`Current working directory: ${__dirname}`)

// If you wanted to render a file, you would first read it into a string
// (to pass to less.render) and then set the filename field on options to be
// the filename of the main file. less will handle all the processing of the
// imports.
let geometryFile = path.join(__dirname, '../resources/less/geometry/geometry-main.less')
let geometryTarget = path.join(__dirname, '../source/common/assets/css/geometry.css')
let geometryLess = ''

let themes = [
  {
    source: path.join(__dirname, '../resources/less/theme-berlin/theme-main.less'),
    target: path.join(__dirname, '../source/common/assets/css/theme-berlin.css'),
    less: '' // Holds the read input
  },
  {
    source: path.join(__dirname, '../resources/less/theme-frankfurt/theme-main.less'),
    target: path.join(__dirname, '../source/common/assets/css/theme-frankfurt.css'),
    less: ''
  },
  {
    source: path.join(__dirname, '../resources/less/theme-bielefeld/theme-main.less'),
    target: path.join(__dirname, '../source/common/assets/css/theme-bielefeld.css'),
    less: ''
  },
  {
    source: path.join(__dirname, '../resources/less/theme-karl-marx-stadt/theme-main.less'),
    target: path.join(__dirname, '../source/common/assets/css/theme-karl-marx-stadt.css'),
    less: ''
  }
]

log.info('Reading input files ...')

// First read both the theme and the geometry file into memory.

// Geometry
try {
  geometryLess = fs.readFileSync(geometryFile, { encoding: 'utf8' })
  log.success(`Successfully read ${geometryFile}`)
} catch (e) {
  log.error(`ERROR: Could not read ${geometryFile}: ${e.name}`)
  log.error(e.message)
  process.exit(-1)
}

// All themes
for (let theme of themes) {
  try {
    theme.less = fs.readFileSync(theme.source, { encoding: 'utf8' })
    log.success(`Successfully read ${theme.source}`)
  } catch (e) {
    log.error(`ERROR: Could not read ${theme.source}: ${e.name}`)
    log.error(e.message)
  }
}

// NOW THE COMPILING WORK

/*
 * GEOMETRY
 */

log.info(`Compiling ${geometryFile} ...`)
less.render(geometryLess, {
  'filename': geometryFile
}).then(function (output) {
  log.success(`Done compiling ${geometryFile}! Minimising ...`)
  // Overwrite output.css with a minified version.
  output.css = csso.minify(output.css).css
  log.success(`Done minimising ${geometryFile}! Writing to target file ...`)
  try {
    fs.writeFileSync(geometryTarget, output.css, { encoding: 'utf8' })
    log.success(`Done writing CSS to file ${geometryTarget}!`)
    log.info(`Sourcemap: ${output.map}`)
    log.info(`Imported files: [\n    ${output.imports.join(',\n    ')}\n]`)
  } catch (e) {
    log.error(`ERROR: Error on writing ${geometryTarget}: ${e.name}`)
    log.error(e.message)
  }
},
function (error) {
  if (error) {
    log.error(`ERROR: Could not compile ${geometryFile}: ${error.name}`)
    log.error(error.message)
  }
})

/*
 * THEMES
 */

for (let theme of themes) {
  log.info(`Compiling ${theme.source} ...`)
  less.render(theme.less, {
    'filename': theme.source
  }).then(function (output) {
    log.success(`Done minimising ${theme.source}! Writing to target file ...`)
    try {
      fs.writeFileSync(theme.target, output.css, { encoding: 'utf8' })
      log.success(`Done writing CSS to file ${theme.target}`)
      log.info(`Sourcemap: ${output.map}`)
      log.info(`Imported files: [\n    ${output.imports.join(',\n    ')}\n]`)
    } catch (err) {
      log.error(`ERROR: Could not write ${theme.target}: ${err.name}`)
      log.error(err.message)
    }
  }, function (err) {
    if (err) {
      log.error(`ERROR: Could not compile ${theme.source}: ${err.name}`)
      log.error(err.message)
      console.error(err)
    }
  })
}
