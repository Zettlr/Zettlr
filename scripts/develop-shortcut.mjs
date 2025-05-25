/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Develop Shortcut management
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This script adds a .desktop shortcut file to the user's
 *                  application directory. This will point to whatever file the
 *                  `yarn package`-command will produce. This allows compiling
 *                  the app from source and immediately use that one instead of
 *                  the predefined binaries. It should be used cautiously, since
 *                  building fresh from source may introduce bugs.
 *
 * END HEADER
 */
import fs from 'fs'
import path from 'path'

// argv: [ node binary, this file, install/uninstall ]
if (process.argv.length < 3 || ![ 'install', 'uninstall' ].includes(process.argv[2])) {
  console.error('Usage: develop-shortcut [install|uninstall]')
  process.exit(1)
}

if (process.platform !== 'linux') {
  console.error('Installing a desktop shortcut for develop builds is currently only supported on Linux.')
  process.exit(1)
}

if (process.env.HOME === undefined) {
  console.error('Could not install desktop shortcut: HOME environment variable unset.')
  process.exit(1)
}

// NOTE: Desktop files can be either in `/user/share/applications` for system-wide
// installs (writing there usually requires admin rights), or in
// `~/.local/share/applications`, which is per-user. Here it absolutely makes
// sense to only use the user-specific location since the shortcut will point to
// a binary built by the user in question, which will not be accessible to others.
const targetPath = `${process.env.HOME}/.local/share/applications/` // NOTE: Node doesn't auto-expand ~
const desktopName = 'zettlr-dev.desktop'
const desktopFilePath = path.join(targetPath, desktopName)
const repositoryRoot = path.dirname(path.dirname(process.argv[1]))

if (process.argv[2] === 'install') {
  // Install the develop shortcut
  console.log(`Installing desktop shortcut to ${desktopFilePath}...`)
  if (fs.existsSync(desktopFilePath)) {
    console.error('Could not install desktop shortcut: Already exists. Please run the uninstaller first.')
    process.exit(1)
  }

  if (!fs.existsSync(targetPath)) {
    console.log(`NOTE: Application folder ${targetPath} does not yet exist. Creating...`)
    fs.mkdirSync(targetPath, { recursive: true })
  }

  let contents = fs.readFileSync(path.join(repositoryRoot, 'scripts/assets/zettlr-dev.desktop'), 'utf-8')
  // Replace the variables we have
  contents = contents.replace(/\$REPO_ROOT/g, repositoryRoot)
  contents = contents.replace(/\$ARCH/g, process.arch)
  console.log(`\n${contents}\n`)
  try {
    fs.writeFileSync(desktopFilePath, contents, 'utf-8')
    console.log(`Desktop shortcut successfully installed to ${desktopFilePath}.`)
    console.warn('NOTE: Remember to build the application before launching!')
  } catch (err) {
    if (err.code === 'EACCESS') {
      console.error('Could not install desktop shortcut: No permission.')
    } else {
      console.error(`Could not install desktop shortcut: ${err.message}`)
    }
    process.exit(1)
  }
} else if (process.argv[2] === 'uninstall') {
  // Uninstall the develop shortcut
  console.log(`Uninstalling desktop shortcut from ${desktopFilePath}...`)
  if (fs.existsSync(desktopFilePath)) {
    fs.unlinkSync(desktopFilePath)
    console.log('Desktop shortcut successfully uninstalled.')
  } else {
    console.warn('Could not uninstall desktop shortcut: Not found.')
  }
} else {
  console.error(`Unrecognized command: ${process.argv[1]}`)
  process.exit(1)
}
