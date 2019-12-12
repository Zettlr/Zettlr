/*
* This script builds the app based upon the command line arguments.
*/

const builder = require('electron-builder')
const Platform = builder.Platform
const log = require('./console-colour.js')
const path = require('path')

/**
* POSSIBLE ARGUMENTS
* --dir: Don't package the app, only export to directory
* --mac: Build for macOS
* --win: Build for Windows
* --linux: Build for Linux
* --app-image: Build for AppImage
*/

let flags = process.argv // Contains the CLI flags
let buildTargets // Contains all build targets
let onlyDir = false // Is set to true, if --dir flag is given on command line
const arifactFilenameFormat = 'Zettlr-${version}-${platform}-${arch}.${ext}'

// Set the current working directory to the app's root.
process.chdir(path.resolve(__dirname, '../'))
log.info(`CWD is: ${process.cwd()}`)

if (flags.length > 2) {
  // There is at least one flag given on the command line
  flags = flags.slice(2)
  onlyDir = flags.includes('--dir')
}

// Extract the build targets
buildTargets = flags.filter(elem => [ '--mac', '--win', '--linux', '--app-image' ].includes(elem))

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

const appImageTarget = [{
  target: 'AppImage',
  arch: [
    'x64',
    'ia32'
  ]
}]

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
  afterPack: './scripts/afterPack.js',
  mac: {
    category: 'public.app-category.productivity',
    target: (onlyDir) ? 'dir' : 'dmg',
    artifactName: arifactFilenameFormat, // eslint-disable-line
    icon: 'resources/icons/icns/icon.icns',
    darkModeSupport: true
  },
  win: {
    target: (onlyDir) ? 'dir' : 'nsis',
    artifactName: arifactFilenameFormat, // eslint-disable-line
    icon: 'resources/icons/ico/icon.ico'
  },
  linux: {
    target: (onlyDir) ? 'dir' : buildTargets.includes('--app-image') ? appImageTarget : [ 'deb', 'rpm' ],
    artifactName: arifactFilenameFormat, // eslint-disable-line
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
    ]
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
})

async function runBuilder () {
  for (let flag of buildTargets) {
    let target
    if (flag === '--mac') target = Platform.MAC.createTarget()
    if (flag === '--win') target = Platform.WINDOWS.createTarget()
    if (flag === '--linux') target = Platform.LINUX.createTarget()
    if (flag === '--app-image') target = Platform.LINUX.createTarget()
    await builder.build({ 'targets': target, 'config': config })
    log.success(`Build for ${flag.substr(2)} complete!`)
  }
}
