module.exports = {
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
      appleIdPassword: process.env['APPLE_ID_PASS'],
    },
    extraResource: [
      // This self-executing function returns a string to the Pandoc binary if
      // we can include one in the built installer. NOTE: This logic relies
      // upon the Pandoc binary being downloaded after executing
      // ./scripts/get-pandoc.sh
      (function () {
        // Determine whether we can bundle Pandoc (and which version) based
        // on the arguments passed to Electron forge and the process environment
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
        const supportsPandoc = is64Bit || (isMacOS && isArm64)

        if (supportsPandoc && isWin32) {
          console.log('\nBundling Pandoc for Windows 64 bit!')
          return './resources/pandoc.exe'
        } else if (supportsPandoc && (isMacOS || isLinux)) {
          console.log('\nBundling Pandoc for 64 bit or Apple M1!')
          return './resources/pandoc'
        } else {
          console.log('\nBuilding for an unsupported platform/arch-combination - not bundling Pandoc.')
          return '' // Don't bundle Pandoc
        }
      })()
    ]
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
              html: './source/renderer/assets/index.htm',
              js: './source/renderer/renderer.ts',
              name: 'main_window'
            },
            {
              html: './source/print/index.htm',
              js: './source/print/zettlr-print-window.ts',
              name: 'print'
            },
            {
              html: './source/log-viewer/index.htm',
              js: './source/log-viewer/index.js',
              name: 'log_viewer'
            },
            {
              html: './source/quicklook/index.htm',
              js: './source/quicklook/zettlr-quicklook-window.ts',
              name: 'quicklook'
            }
          ]
        }
      }
    ]
  ]
}
