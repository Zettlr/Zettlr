// This script updates the reveal.js template to the newest version
import path from 'path'
import { promises as fs } from 'fs'
import { info, success, error } from './console-colour.mjs'
import { minify } from 'csso'

// What we need to do is the following:
// 1. Retrieve reveal.js from the node_modules
// 2. Minify the file
// 3. Retrieve both reset.css and reveal.css and minify as well.
// 4. Build the export template and overwrite it in the source folder.
// 5. For each of the themes, retrieve them from the node_modules
// 6. Minify the themes and overwrite the respective files.

const __dirname = process.platform === 'win32'
  ? path.dirname(decodeURI(import.meta.url.substring(8))) // file:///C:/...
  : path.dirname(decodeURI(import.meta.url.substring(7))) // file:///root/...

const revealBasePath = path.join(__dirname, '../node_modules/reveal.js/')
const themeBasePath = path.join(revealBasePath, 'dist/theme')
const revealTemplatePath = path.join(__dirname, '../static/template.revealjs.htm')
const revealStyleOutputBasePath = path.join(__dirname, '../static/revealjs-styles')

const zettlrTemplatePath = path.join(__dirname, 'assets/reveal-template.htm')
const zettlrSyntaxPath = path.join(__dirname, 'assets')
const revealCSSPath = path.join(revealBasePath, 'dist/reveal.css')
const resetCSSPath = path.join(revealBasePath, 'dist/reset.css')
const revealJSPath = path.join(revealBasePath, 'dist/reveal.js')
const themes = [
  'beige',
  'black',
  'league',
  'moon',
  'serif',
  'sky',
  'solarized',
  'white'
]

const codeHighlightingTheme = [
  'skylighting-dark.css',
  'skylighting-light.css'
]

async function run () {
  let revealJS = ''
  let revealCSS = ''
  // First retrieve the JS file
  revealJS = await fs.readFile(revealJSPath, 'utf8')
  // Now retrieve the CSS
  revealCSS = await fs.readFile(resetCSSPath, 'utf8')
  let tmp = await fs.readFile(revealCSSPath, 'utf8')
  revealCSS += '\n' + tmp
  // Display debugging information
  info(`[INPUT] revealJS:  ${revealJS.length} characters, ${revealJS.split('\n').length} lines`)
  info(`[INPUT] revealCSS: ${revealCSS.length} characters, ${revealCSS.split('\n').length} lines`)

  // Make sure the CSS path is available
  try {
    await fs.lstat(revealStyleOutputBasePath)
  } catch (err) {
    await fs.mkdir(revealStyleOutputBasePath)
  }

  // Now we can build the template file.
  // First read it in.
  let template = await fs.readFile(zettlrTemplatePath, 'utf8')
  template = template.replace('$REVEAL_CSS$', revealCSS)
  template = template.replace('$REVEAL_JS$', revealJS)
  // Now write the template into the assets folder.
  await fs.writeFile(revealTemplatePath, template)
  success(`Wrote output template file to ${path.relative(__dirname, revealTemplatePath)}`)

  // Finally, we need to minify and overwrite the themes.
  for (let theme of themes) {
    info(`Processing theme ${theme} ...`)
    // Read ...
    tmp = await fs.readFile(path.join(themeBasePath, theme + '.css'), 'utf8')
    // ... minify ...
    tmp = minify(tmp).css
    // ... and write!
    await fs.writeFile(path.join(revealStyleOutputBasePath, theme + '.css'), tmp)
    success(`Written theme ${theme} to ${path.relative(__dirname, revealStyleOutputBasePath)}!`)
  }

  for (let theme of codeHighlightingTheme) {
    info(`Processing theme ${theme}`)
    // The syntax highlighting themes need to be simply copied over
    await fs.copyFile(path.join(zettlrSyntaxPath, theme), path.join(revealStyleOutputBasePath, theme))
    success(`Written theme ${theme} to ${path.relative(__dirname, revealStyleOutputBasePath)}!`)
  }
}

run().then(() => {
  success('reveal.JS has been updated successfully!')
}).catch((err) => {
  error('Could not update reveal.JS')
  console.error(err)
  // We have to exit the process with an
  // error signal for correct behaviour on CI
  process.exit(1)
})
