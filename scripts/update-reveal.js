// This script updates the reveal.js template to the newest version
const path = require('path')
const fs = require('fs').promises
const log = require('./console-colour.js')
const UglifyJS = require('uglify-js')
const csso = require('csso')

// What we need to do is the following:
// 1. Retrieve reveal.js from the node_modules
// 2. Minify the file
// 3. Retrieve both reset.css and reveal.css and minify as well.
// 4. Build the export template and overwrite it in the source folder.
// 5. For each of the themes, retrieve them from the node_modules
// 6. Minify the themes and overwrite the respective files.

let revealBasePath = path.join(__dirname, '../node_modules/reveal.js/')
let themeBasePath = path.join(revealBasePath, 'css/theme')
let revealTemplatePath = path.join(__dirname, '../source/main/assets/template.revealjs.htm')
let revealStyleOutputBasePath = path.join(__dirname, '../source/main/assets/revealjs-styles')
let themes = [
  'beige',
  'black',
  'league',
  'moon',
  'serif',
  'sky',
  'solarized',
  'white'
]

async function run () {
  let revealJS = ''
  let revealCSS = ''
  let file
  // First retrieve the JS file
  file = await fs.open(path.join(revealBasePath, '/js/reveal.js'))
  revealJS = await file.readFile({ encoding: 'utf8' })
  await file.close()
  // Now retrieve the CSS
  file = await fs.open(path.join(revealBasePath, 'css/reset.css'))
  revealCSS = await file.readFile({ encoding: 'utf8' })
  await file.close()
  file = await fs.open(path.join(revealBasePath, 'css/reveal.css'))
  let tmp = await file.readFile({ encoding: 'utf8' })
  await file.close()
  revealCSS += '\n' + tmp
  // Display debugging information
  log.info(`[INPUT] revealJS:  ${revealJS.length} characters, ${revealJS.split('\n').length} lines`)
  log.info(`[INPUT] revealCSS: ${revealCSS.length} characters, ${revealCSS.split('\n').length} lines`)

  // Now minify the JS
  let minificationResult = UglifyJS.minify(revealJS)
  if (minificationResult.error) {
    log.error(minificationResult.error)
    throw new Error(minificationResult.error)
  }
  revealJS = minificationResult.code

  // Now the CSS
  revealCSS = csso.minify(revealCSS).css

  log.success(`[OUTPUT] revealJS:  ${revealJS.length} characters, ${revealJS.split('\n').length} lines`)
  log.success(`[OUTPUT] revealCSS: ${revealCSS.length} characters, ${revealCSS.split('\n').length} lines`)

  // Now we can build the template file.
  // First read it in.
  file = await fs.open(path.join(__dirname, 'assets/reveal-template.htm'))
  let template = await file.readFile({ encoding: 'utf8' })
  await file.close()
  template = template.replace('$REVEAL_CSS$', revealCSS)
  template = template.replace('$REVEAL_JS$', revealJS)
  // Now write the template into the assets folder.
  await fs.writeFile(revealTemplatePath, template)
  log.success(`Wrote output template file to ${path.relative(__dirname, revealTemplatePath)}`)

  // Finally, we need to minify and overwrite the themes.
  for (let theme of themes) {
    log.info(`Processing theme ${theme} ...`)
    // Read ...
    file = await fs.open(path.join(themeBasePath, theme + '.css'))
    tmp = await file.readFile({ encoding: 'utf8' })
    await file.close()
    // ... minify ...
    tmp = csso.minify(tmp).css
    // ... and write!
    await fs.writeFile(path.join(revealStyleOutputBasePath, theme + '.css'), tmp)
    log.success(`Written theme ${theme} to ${path.relative(__dirname, revealStyleOutputBasePath)}!`)
  }
}

run().then(() => {
  log.success('reveal.JS has been updated successfully!')
}).catch((err) => {
  log.error('Could not update reveal.JS')
  console.error(err)
  // We have to exit the process with an
  // error signal for correct behaviour on CI
  process.exit(1)
})
