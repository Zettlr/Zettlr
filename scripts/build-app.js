/*
* This script builds the app based upon the command line arguments.
*/

const builder = require('electron-builder')
const Platform = builder.Platform
const log = require('./console-colour.js')
const path = require('path')

// Define the target list for Linux and Windows builds
const linuxTargets = [{ target: 'AppImage', arch: [ 'x64', 'ia32' ] }, 'deb', 'rpm' ]
const win32Targets = [{ target: 'nsis', arch: [ 'x64', 'ia32' ] }]

/**
* POSSIBLE ARGUMENTS
* --dir: Don't package the app, only export to directory
* --mac: Build for macOS
* --win: Build for Windows
* --linux: Build for Linux
*/

let flags = process.argv // Contains the CLI flags
let buildTargets // Contains all build targets
let onlyDir = false // Is set to true, if --dir flag is given on command line
const artifactFilenameFormat = 'Zettlr-${version}-${arch}.${ext}' // eslint-disable-line

// Set the current working directory to the app's root.
process.chdir(path.resolve(__dirname, '../'))
log.info(`CWD is: ${process.cwd()}`)

if (flags.length > 2) {
  // There is at least one flag given on the command line
  flags = flags.slice(2)
  onlyDir = flags.includes('--dir')
}

// Extract the build targets
buildTargets = flags.filter(elem => [ '--mac', '--win', '--linux' ].includes(elem))

if (buildTargets.length === 0) {
  // We need at least one build target, so let's assume the current platform
  switch (process.platform) {
    case 'darwin':
      buildTargets.push('--mac')
      break
    case 'win32':
      buildTargets.push('--win')
      break
    case 'linux':
      buildTargets.push('--linux')
      break
  }
}

if (buildTargets.length === 0) {
  log.info('No targets given! Aborting build process ...')
  process.exit(0)
}

log.info('Starting build process')
log.info(`Building for: ${buildTargets.map(elem => elem.substr(2)).join(', ')}`)

const config = {
  appId: 'com.zettlr.app',
  productName: 'Zettlr',
  npmRebuild: false,
  copyright: 'Zettlr is licensed under GNU GPL v3.',
  fileAssociations: [
    {
      ext: 'md',
      name: 'Markdown',
      description: 'Markdown document',
      mimeType: 'text/markdown',
      role: 'Editor',
      isPackage: false
    },
    {
      ext: 'markdown',
      name: 'Markdown',
      description: 'Markdown document',
      mimeType: 'text/markdown',
      role: 'Editor',
      isPackage: false
    }
  ],
  directories: {
    output: 'release',
    app: 'source'
  },
  // Scripts to run after certain hooks
  afterPack: './scripts/afterPack.js',
  afterSign: './scripts/afterSign.js',
  mac: {
    category: 'public.app-category.productivity',
    target: (onlyDir) ? 'dir' : 'dmg',
    artifactName: artifactFilenameFormat,
    icon: 'resources/icons/icns/icon.icns',
    darkModeSupport: true,
    hardenedRuntime: true,
    // This is not really necessary, but funfact: It's a bug, so we have to set it to false
    // Further info: https://github.com/electron-userland/electron-builder/issues/3828
    gatekeeperAssess: false,
    entitlements: path.join(__dirname, './assets/entitlements.plist'),
    entitlementsInherit: path.join(__dirname, './assets/entitlements.plist')
  },
  win: {
    target: (onlyDir) ? 'dir' : win32Targets,
    artifactName: artifactFilenameFormat,
    icon: 'resources/icons/ico/icon.ico'
  },
  linux: {
    target: (onlyDir) ? 'dir' : linuxTargets,
    artifactName: artifactFilenameFormat,
    synopsis: 'Markdown editor',
    category: 'Office',
    icon: 'resources/icons/png',
    desktop: {
      'StartupWMClass': 'zettlr' // Needed for compatibility with some docks, see #341
    }
  },
  dmg: {
    background: 'resources/icons/dmg/dmg_back.tiff',
    icon: 'resources/icons/icns/icon.icns',
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 400 // Default 380px is insufficient as it doesn't include 20px of title bar
    }
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    uninstallDisplayName: '${productName}' // eslint-disable-line
  },
  deb: {
    priority: 'optional',
    compression: 'xz'
  },
  rpm: { compression: 'xz' }
}

runBuilder().then(() => {
  log.success('Build run complete!')
}).catch((err) => {
  log.error('Build failed!')
  log.error(err)
  // We have to exit the process with an
  // error signal for correct behaviour on CI
  process.exit(1)
})

async function runBuilder () {
  for (let flag of buildTargets) {
    let target
    if (flag === '--mac') target = Platform.MAC.createTarget()
    if (flag === '--win') target = Platform.WINDOWS.createTarget()
    if (flag === '--linux') target = Platform.LINUX.createTarget()
    await builder.build({ 'targets': target, 'config': config })
    log.success(`Build for ${flag.substr(2)} complete!`)
  }
}
