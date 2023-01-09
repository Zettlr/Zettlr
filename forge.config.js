const { spawn } = require('child_process')
const fs = require('fs').promises
const path = require('path')

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
    const argWin = [ 'bash.exe', [ './scripts/get-pandoc.sh', platform, arch ] ]
    const argUnix = [ './scripts/get-pandoc.sh', [ platform, arch ] ]
    // Use the spread operator to spawn the process using the correct arguments.
    const shellProcess = (process.platform === 'win32') ? spawn(...argWin) : spawn(...argUnix)

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
    generateAssets: async (forgeConfig, targetPlatform, targetArch) => {
      // Two steps need to be done here. First, we need to set an environment
      // variable that is then accessible by the webpack process so that we can
      // either include or not include fsevents for macOS platforms.
      process.env.BUNDLE_FSEVENTS = (targetPlatform === 'darwin') ? '1' : '0'

      // Second, we need to make sure we can bundle Pandoc.
      const isMacOS = targetPlatform === 'darwin'
      const isLinux = targetPlatform === 'linux'
      const isWin32 = targetPlatform === 'win32'
      const isArm64 = targetArch === 'arm64'
      const is64Bit = targetArch === 'x64'

      // macOS has Rosetta 2 built-in, so we can bundle Pandoc 64bit
      const supportsPandoc = is64Bit || (isMacOS && isArm64) || (isLinux && isArm64)

      if (supportsPandoc && isWin32) {
        // Download Pandoc beforehand, if it's not yet there.
        try {
          await fs.lstat(path.join(__dirname, './resources/pandoc-win32-x64.exe'))
        } catch (err) {
          await downloadPandoc('win32', 'x64')
        }

        await fs.copyFile(path.join(__dirname, './resources/pandoc-win32-x64.exe'), path.join(__dirname, './resources/pandoc.exe'))

        forgeConfig.packagerConfig.extraResource.push(path.join(__dirname, './resources/pandoc.exe'))
      } else if (supportsPandoc && (isMacOS || isLinux)) {
        // Download Pandoc either for macOS or Linux ...
        const platform = (isMacOS) ? 'darwin' : 'linux'
        // ... and the ARM version if we're downloading for Linux ARM, else x64.
        const arch = (isLinux && isArm64) ? 'arm' : 'x64'
        try {
          await fs.lstat(path.join(__dirname, `./resources/pandoc-${platform}-${arch}`))
        } catch (err) {
          await downloadPandoc(platform, arch)
        }

        await fs.copyFile(path.join(__dirname, `./resources/pandoc-${platform}-${arch}`), path.join(__dirname, './resources/pandoc'))

        forgeConfig.packagerConfig.extraResource.push(path.join(__dirname, './resources/pandoc'))
      } else {
        // If someone is building this on an unsupported platform, drop a warning.
        console.log(`\nBuilding for an unsupported platform/arch-combination ${targetPlatform}/${targetArch} - not bundling Pandoc.`)
      }
    }
  },
  rebuildConfig: {
    // Since we must build native modules for both x64 as well as arm64, we have
    // to explicitly build it everytime for the correct architecture
    force: true
  },
  packagerConfig: {
    appBundleId: 'com.zettlr.app',
    // This info.plist file contains file association for the app on macOS.
    extendInfo: './scripts/assets/info.plist',
    asar: {
      // We must add native node modules to this option. Doing so ensures that
      // the modules will be code-signed. (They still end up in the final
      // app.asar file, but they will be code-signed.) Code signing these dylibs
      // is required on macOS for the Node process to properly load them.
      unpack: '*.{node,dll}'
    },
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
    // Since electron-notarize 1.1.0 it will throw instead of simply print a
    // warning to the console, so we have to actively check if we should
    // notarize or not. We do so by checking for the necessary environment
    // variables and set the osxNotarize option to false otherwise to prevent
    // notarization.
    osxNotarize: ('APPLE_ID' in process.env && 'APPLE_ID_PASS' in process.env)
      ? {
          tool: 'notarytool',
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_ID_PASS,
          teamId: 'QS52BN8W68'
        }
      : false,
    extraResource: [
      'resources/icons/icon.code.icns'
    ]
  },
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        // Since electron-forge v6.0.0-beta.58, this property controls the CSP
        // for the development process. Since the defaults by electron-forge are
        // not suitable for our needs (since they prevent the usage of our
        // custom safe-file:// protocol), we must manually set this. Here we are
        // basically copying the CSP from the HTML-files, but with 'unsafe-eval'
        // added (which webpack needs for the sourcemaps).
        devContentSecurityPolicy: "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        // The default port for php-fpm is 9000, and since forge and PHP will
        // collide on every system on which PHP is installed, we change the
        // default ports for both the logger and the dev servers. We have to set
        // both ports, because changing only one doesn't solve the issue.
        port: 3000,
        loggerPort: 9001,
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './static/index.htm',
              js: './source/win-main/index.ts',
              name: 'main_window',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-print/index.ts',
              name: 'print',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-log-viewer/index.ts',
              name: 'log_viewer',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-preferences/index.ts',
              name: 'preferences',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-tag-manager/index.ts',
              name: 'tag_manager',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-paste-image/index.ts',
              name: 'paste_image',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-error/index.ts',
              name: 'error',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-about/index.ts',
              name: 'about',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-stats/index.ts',
              name: 'stats',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-assets/index.ts',
              name: 'assets',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-update/index.ts',
              name: 'update',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            },
            {
              html: './static/index.htm',
              js: './source/win-project-properties/index.ts',
              name: 'project_properties',
              preload: {
                js: './source/common/modules/preload/index.ts'
              }
            }
          ]
        }
      }
    }
  ]
}
