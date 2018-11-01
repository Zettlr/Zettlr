// This script generates both main.css and zettlr-theme.css.
// Run with `npm run less`

const less = require('less')
const fs = require('fs')
const path = require('path')
const log = require('./console-colour.js')
const csso = require('csso')

log.info(`Starting LESS compiler ...`)

log.info(`Current working directory: ${__dirname}`)

// If you wanted to render a file, you would first read it into a string
// (to pass to less.render) and then set the filename field on options to be
// the filename of the main file. less will handle all the processing of the
// imports.
let geometryFile = path.join(__dirname, '../resources/less/geometry/geometry-main.less')
let geometryTarget = path.join(__dirname, '../source/renderer/assets/css/geometry.css')
let themeFile = path.join(__dirname, '../resources/less/theme-default/theme-main.less')
let themeTarget = path.join(__dirname, '../source/renderer/assets/css/theme.css')
let geometryLess = ''
let themeLess = ''

log.info(`Reading input files ...`)

// First read both the theme and the geometry file into memory.
try {
  themeLess = fs.readFileSync(themeFile, { encoding: 'utf8' })
  log.success(`Successfully read ${themeFile}`)
} catch (e) {
  log.error(`ERROR: Could not read ${themeFile}: ${e.name}`)
  log.error(e.message)
  process.exit(-1)
}

try {
  geometryLess = fs.readFileSync(geometryFile, { encoding: 'utf8' })
  log.success(`Successfully read ${geometryFile}`)
} catch (e) {
  log.error(`ERROR: Could not read ${geometryFile}: ${e.name}`)
  log.error(e.message)
  process.exit(-1)
}

/*
 * THEME
 */

log.info(`Compiling ${themeFile} ...`)
less.render(themeLess, {
  'filename': themeFile
}).then(function (output) {
  log.success(`Done compiling ${themeFile}! Minimising ...`)
  // Overwrite output.css with a minified version.
  output.css = csso.minify(output.css).css
  log.success(`Done minimising ${themeFile}! Writing to target file ...`)
  try {
    fs.writeFileSync(themeTarget, output.css, { encoding: 'utf8' })
    log.success(`Done writing CSS to file ${themeTarget}!`)
    log.info(`Sourcemap: ${output.map}`)
    log.info(`Imported files: [\n   ${output.imports.join(',\n    ')}\n]`)
  } catch (e) {
    log.error(`ERROR: Error on writing ${themeFile}: ${e.name}`)
    log.error(e.message)
  }
},
function (error) {
  if (error) {
    log.error(`ERROR: Could not compile ${themeFile}: ${error.name}`)
    log.error(error.message)
  }
})

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
    log.info(`Imported files: [\n   ${output.imports.join(',\n    ')}\n]`)
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
