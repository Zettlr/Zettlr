const { spawn } = require('child_process')

/**
 * This function runs the get-pandoc script in order to download the requested
 * version of Pandoc. This way we can guarantee that the correct Pandoc version
 * will be present when packaging the application.
 *
 * @param   {string}  platform  The platform for which to download.
 * @param   {string}  arch      The architecture for which to download.
 */
async function downloadPandoc (platform, arch) {
  // Check we have a valid platform ...
  if (![ 'darwin', 'linux', 'win32' ].includes(platform)) {
    throw new Error(`Cannot download Pandoc: Platform ${platform} is not recognised!`)
  }

  // ... and a valid architecture.
  if (![ 'x64', 'arm' ].includes(arch)) {
    throw new Error(`Cannot download Pandoc: Architecture ${arch} is not supported!`)
  }

  // Now run the script and wait for it to finish.
  await new Promise((resolve, reject) => {
    const shellProcess = spawn('./scripts/get-pandoc.sh', [ platform, arch ])

    // To not mess with Electron forge's output, suppress this processes output.
    // But we should reject if there's any error output.
    let shouldReject = false
    shellProcess.stderr.on('data', (data) => {
      shouldReject = true
    })

    // Resolve or reject once the process has finished.
    shellProcess.on('close', (code, signal) => {
      if (code !== 0 || shouldReject) {
        reject(new Error(`Failed to download Pandoc: Process quit with code ${code}. If the code is 0, then there was error output.`))
      } else {
        resolve()
      }
    })

    // Reject on errors.
    shellProcess.on('error', (err) => {
      reject(err)
    })
  })
}

module.exports = {
  hooks: {
    generateAssets: async (forgeConfig) => {
      // Check if we can bundle Pandoc. To mimick electron forge's behaviour,
      // we check the same CLI arguments, and fall back to the current platform,
      // if applicable.
      const idxPlatform = process.argv.indexOf('--platform')
      const idxArch = process.argv.indexOf('--arch')

      const thisPlatform = process.platform
      const thisArch = process.arch

      const isWin32 = (idxPlatform > -1 && process.argv[idxPlatform + 1] === 'win32') || thisPlatform === 'win32'
      const isMacOS = (idxPlatform > -1 && process.argv[idxPlatform + 1] === 'darwin') || thisPlatform === 'darwin'
      const isLinux = (idxPlatform > -1 && process.argv[idxPlatform + 1] === 'linux') || thisPlatform === 'linux'
      const isArm64 = (idxArch > -1 && process.argv[idxArch + 1] === 'arm64') || thisArch === 'arm64'
      const is64Bit = (idxArch > -1 && process.argv[idxArch + 1] === 'x64') || thisArch === 'x64'

      // macOS has Rosetta 2 built-in, so we can bundle Pandoc 64bit
      const supportsPandoc = is64Bit || (isMacOS && isArm64) || (isLinux && isArm64)

      if (supportsPandoc && isWin32) {
        // Download Pandoc beforehand
        await downloadPandoc('win32', 'x64')
        forgeConfig.packagerConfig.extraResource.push('./resources/pandoc.exe')
      } else if (supportsPandoc && (isMacOS || isLinux)) {
        // Download Pandoc either for macOS or Linux ...
        const platform = (isMacOS) ? 'darwin' : 'linux'
        // ... and the ARM version if we're downloading for Linux ARM, else x64.
        const arch = (isLinux && isArm64) ? 'arm' : 'x64'
        await downloadPandoc(platform, arch)
        forgeConfig.packagerConfig.extraResource.push('./resources/pandoc')
      } else {
        // If someone is building this on an unsupported platform, drop a warning.
        console.log('\nBuilding for an unsupported platform/arch-combination - not bundling Pandoc.')
      }
    }
  },
  packagerConfig: {
    asar: true,
    darwinDarkModeSupport: 'true',
    // Electron-forge automatically adds the file extension based on OS
    icon: './resources/icons/icon',
    // The binary name should always be uppercase Zettlr. As we cannot specify
    // this on a per-maker basis, we need to output everything this way. With
    // this property, macOS builds are named Zettlr.app, Windows builds
    // Zettlr.exe and the linux binaries are called Zettlr (albeit on Linux,
    // lowercase is preferred). Due to the last issue (Linux binaries being
    // with capital Z) we have to explicitly set executableName on the Linux
    // target.
    name: 'Zettlr',
    // The certificate is written to the default keychain during CI build.
    // See ./scripts/add-osx-cert.sh
    osxSign: {
      identity: 'Developer ID Application: Hendrik Erz (QS52BN8W68)',
      'hardened-runtime': true,
      'gatekeeper-assess': false,
      entitlements: 'scripts/assets/entitlements.plist',
      'entitlements-inherit': 'scripts/assets/entitlements.plist',
      'signature-flags': 'library'
    },
    osxNotarize: {
      appleId: process.env['APPLE_ID'],
      appleIdPassword: process.env['APPLE_ID_PASS']
    },
    extraResource: [] // NOTE: This will be filled in the generateAssets hook
  },
  plugins: [
    [
      '@electron-forge/plugin-webpack',
      {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './source/win-main/index.htm',
              js: './source/win-main/index.ts',
              name: 'main_window'
            },
            {
              html: './source/win-print/index.htm',
              js: './source/win-print/index.ts',
              name: 'print'
            },
            {
              html: './source/win-log-viewer/index.htm',
              js: './source/win-log-viewer/index.ts',
              name: 'log_viewer'
            },
            {
              html: './source/win-quicklook/index.htm',
              js: './source/win-quicklook/index.ts',
              name: 'quicklook'
            },
            {
              html: './source/win-preferences/index.htm',
              js: './source/win-preferences/index.ts',
              name: 'preferences'
            },
            {
              html: './source/win-custom-css/index.htm',
              js: './source/win-custom-css/index.ts',
              name: 'custom_css'
            },
            {
              html: './source/win-tag-manager/index.htm',
              js: './source/win-tag-manager/index.ts',
              name: 'tag_manager'
            },
            {
              html: './source/win-paste-image/index.htm',
              js: './source/win-paste-image/index.ts',
              name: 'paste_image'
            },
            {
              html: './source/win-error/index.htm',
              js: './source/win-error/index.ts',
              name: 'error'
            },
            {
              html: './source/win-about/index.htm',
              js: './source/win-about/index.ts',
              name: 'about'
            },
            {
              html: './source/win-stats/index.htm',
              js: './source/win-stats/index.ts',
              name: 'stats'
            },
            {
              html: './source/win-defaults/index.htm',
              js: './source/win-defaults/index.ts',
              name: 'defaults'
            }
          ]
        }
      }
    ]
  ]
}
