const fs = require('fs')
const path = require('path')
const log = require('./console-colour.js')

// A recursive copy function that can transfer whole directories from one place
// to another.
module.exports = function copyRecursive (from, to) {
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
