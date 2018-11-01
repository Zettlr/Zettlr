// This script precompiles handlebars templates and makes sure the runtime
// libraries are available to the renderer process (as the full package won't
// be shipped to save space).

const log = require('./console-colour.js') // Colourful output
const fs = require('fs')
const path = require('path')
const handlebars = require('handlebars')

// What to copy?
let runtimeInput = path.join(__dirname, '..', 'node_modules/handlebars/dist/cjs')
let runtimeOutput = path.join(__dirname, '..', 'source/renderer/assets/handlebars-runtime/')

log.info(`Starting Handlebars distribution ...`)
log.info(`CWD: ${__dirname}\n`)

// First copy over the runtime libraries
// Step 1: And how about the input path?
try {
  fs.lstatSync(runtimeInput)
} catch (e) {
  log.error(`The runtime libraries haven't been found! Did you run "npm install"?`)
  process.exit(-1)
}

// Step 2: Does the output path exist?
try {
  log.info('Checking existence of the runtime output path ...')
  fs.lstatSync(runtimeOutput)
  log.success(`Path ${runtimeOutput} exists!`)
} catch (e) {
  log.warn(`Path ${runtimeOutput} does not exist. Creating ...`)
  try {
    fs.mkdirSync(runtimeOutput)
    log.success(`Directory created!`)
  } catch (e) {
    log.error(`Could not create the output path for the runtime! Exiting ...`)
    process.exit(-1)
  }
}

// Step 3: Copy!
function copyRecursive (from, to) {
  // First check that we have a valid path
  let stat
  try {
    stat = fs.lstatSync(from)
    if (!stat.isDirectory() && !stat.isFile()) throw new Error(`${from} is not a valid file or directory!`)
  } catch (e) {
    log.error(e.message)
    return
  }

  if (stat && stat.isFile()) {
    // We have a file to copy over.
    try {
      fs.copyFileSync(from, path.join(to, path.basename(from)))
      log.success(`Copied ${path.basename(from)}`)
    } catch (e) {
      log.error(`Error on copying ${path.basename(from)}!`)
    }
  } else if (stat && stat.isDirectory()) {
    // Create the respective directory in the target.
    try {
      fs.lstatSync(path.join(to, path.basename(from)))
    } catch (e) {
      log.info(`Creating directory ${path.basename(from)} ...`)
      try {
        fs.mkdirSync(path.join(to, path.basename(from)))
        log.success(`Created ${path.basename(from)}`)
      } catch (e) {
        log.error(`Error on creating ${path.basename(from)}!`)
      }
    }

    // Now copy over the directory
    let dir = fs.readdirSync(from)
    for (let p of dir) {
      copyRecursive(path.join(from, p), path.join(to, path.basename(from)))
    }
  }
}

// Hehe, the actual copying begins here.
log.info('Copying files recursively to destination ...')
let fileList = fs.readdirSync(runtimeInput)
for (let file of fileList) {
  copyRecursive(path.join(runtimeInput, file), runtimeOutput)
}

log.success(`Done copying!`)

// Now precompile all templates.
log.info(`Compiling templates ...`)
let input = path.join(__dirname, '..', 'resources/handlebars-tpl')
let output = path.join(__dirname, '..', 'source/renderer/assets/handlebars-tpl')

let templates = fs.readdirSync(input)

for (let tpl of templates) {
  if (path.extname(tpl) !== '.handlebars') continue // Only compile handlebars
  try {
    // Read the file
    let inTpl = fs.readFileSync(path.join(input, tpl), 'utf8')
    // Compile
    let compiled = handlebars.precompile(inTpl)
    // The resultant file is basically a JavaScript function so to prevent strange
    // effects simply append a ".js".
    // ATTENTION! As the NodeJS function does NOT generate standalone files, we
    // have to wrap this with module.exports to ensure it is possible to require
    // the template at runtime!
    fs.writeFileSync(path.join(output, `${tpl}.js`), `module.exports = ${compiled}`, 'utf8')
    log.success(`Compiled ${tpl}!`)
  } catch (e) {
    log.error(`Error compiling ${tpl}: ${e.message}`)
  }
}
