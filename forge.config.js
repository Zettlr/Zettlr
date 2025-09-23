const { spawn } = require('child_process')
const fs = require('fs').promises
const path = require('path')
const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseV1Options, FuseVersion } = require('@electron/fuses')
const { getGitHash } = require('./scripts/get-git-hash.js')

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
    shellProcess.stderr.on('data', (_data) => {
      shouldReject = true
    })

    // Resolve or reject once the process has finished.
    shellProcess.on('close', (code, _signal) => {
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

/**
 * Since all our renderers share the same static HTML file and the same preload
 * script, we can save on a LOT of repeated code by just generating the entry
 * points with a tiny utility function.
 * 
 * NOTE:
 * 
 * * This function assumes that the entry point lives in a folder and has an
 * `index.ts` entry point file.
 *
 * @param   {string}  name    The name of the entry point (this determines, e.g., folder names in the app)
 * @param   {string}  folder  The containing folder's name (e.g., `win-about`).
 *
 * @return  {any}             The generated entrypoint
 */
function generateRendererEntrypoint (name, folder) {
  return {
    html: './static/index.htm',
    js: `./source/${folder}/index.ts`,
    name,
    preload: {
      js: './source/common/modules/preload/index.ts'
    }
  }
}

module.exports = {
  hooks: {
    generateAssets: async (forgeConfig, targetPlatform, targetArch) => {
      // Two steps need to be done here. First, we need to set an environment
      // variable that is then accessible by the webpack process so that we can
      // either include or not include fsevents for macOS platforms.
      process.env.BUNDLE_FSEVENTS = (targetPlatform === 'darwin') ? '1' : '0'

      // This will be baked into the binary so that we know which commit this
      // build was based off on.
      process.env.GIT_COMMIT_HASH = await getGitHash()

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
        const platform = isMacOS ? 'darwin' : 'linux'
        // ... and the ARM or x64 version.
        const arch = isArm64 ? 'arm' : 'x64'
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
    },
    postMake: async (forgeConfig, makeResults) => {
      const basePath = __dirname
      const releaseDir = path.join(basePath, 'release')

      // Ensure the output dir exists
      try {
        await fs.stat(releaseDir)
      } catch (err) {
        await fs.mkdir(releaseDir, { recursive: true })
      }

      // makeResults is an array for each maker that has the keys `artifacts`,
      // `packageJSON`, `platform`, and `arch`.
      for (const result of makeResults) {
        // Get the necessary information from the object
        const { version, productName } = result.packageJSON

        // NOTE: Other makers may produce more than one artifact, but I'll have
        // to hardcode what to do in those cases.
        if (result.artifacts.length > 1) {
          throw new Error(`More than one artifact generated -- please resolve ambiguity for ${result.platform} ${result.arch} in build script.`)
        }

        const sourceFile = result.artifacts[0]
        const ext = path.extname(sourceFile)

        // NOTE: Arch needs to vary depending on the target platform
        let arch = result.arch
        if (arch === 'x64' && ext === '.deb') {
          arch = 'amd64' // Debian x64
        } else if (arch === 'x64' && [ '.rpm', '.AppImage' ].includes(ext)) {
          arch = 'x86_64' // Fedora x64 and AppImage x64
        } else if (arch === 'arm64' && ext === '.rpm') {
          arch = 'aarch64' // Fedora ARM
        } // Else: Keep it at either x64 or arm64

        // Now we can finally build the correct file name
        const baseName = `${productName}-${version}-${arch}${ext}`

        // Move the file
        await fs.rename(sourceFile, path.join(releaseDir, baseName))
      }
    }
  },
  rebuildConfig: {
    // Since we must build native modules for both x64 as well as arm64, we have
    // to explicitly build it everytime for the correct architecture
    force: false // NOTE: By now covered by the global flag on packaging.
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
          teamId: process.env.APPLE_TEAM_ID
        }
      : false,
    // We only need the extra resources on macOS
    extraResource: process.platform === 'darwin' ? [
      'resources/icons/icon.code.icns',
      'resources/icons/Assets.car' // Contains the new Liquid Glass app icon
    ] : [] // NOTE: Must be an array because the generateAssets hook uses it
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
            // These are all the individual windows the app uses. NOTE that the
            // entry point names are not arbitrary but determine the variable
            // names (see declarations in global.d.ts).
            generateRendererEntrypoint('main_window', 'win-main'),
            generateRendererEntrypoint('print', 'win-print'),
            generateRendererEntrypoint('log_viewer', 'win-log-viewer'),
            generateRendererEntrypoint('preferences', 'win-preferences'),
            generateRendererEntrypoint('tag_manager', 'win-tag-manager'),
            generateRendererEntrypoint('paste_image', 'win-paste-image'),
            generateRendererEntrypoint('error', 'win-error'),
            generateRendererEntrypoint('about', 'win-about'),
            generateRendererEntrypoint('stats', 'win-stats'),
            generateRendererEntrypoint('assets', 'win-assets'),
            generateRendererEntrypoint('update', 'win-update'),
            generateRendererEntrypoint('project_properties', 'win-project-properties'),
            generateRendererEntrypoint('splash_screen', 'win-splash-screen'),
            generateRendererEntrypoint('onboarding', 'win-onboarding')
          ]
        }
      }
    },
    // When building for production, turn off a few fuses that disable certain
    // debug controls of the app.
    ...((process.env.NODE_ENV === 'production')
      ? [new FusesPlugin({
          version: FuseVersion.V1,
          [FuseV1Options.RunAsNode]: false,
          [FuseV1Options.EnableCookieEncryption]: true,
          [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
          [FuseV1Options.EnableNodeCliInspectArguments]: false,
          [FuseV1Options.GrantFileProtocolExtraPrivileges]: true
        })]
      : [])
  ],
  makers: [
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'zettlr',
          bin: 'Zettlr', // See packagerConfig.name property,
          categories: [ 'Office', 'Education', 'Science' ],
          section: 'editors',
          // size: 500, // NOTE: Estimate, need to refine
          description: 'Your one-stop publication workbench.',
          productDescription: 'Your one-stop publication workbench.',
          recommends: [ 'quarto', 'pandoc', 'texlive | texlive-base | texlive-full' ],
          genericName: 'Markdown Editor',
          // Electron forge recommends 512px
          icon: './resources/icons/png/512x512.png',
          priority: 'optional',
          mimeType: [ 'text/markdown', 'application/x-tex', 'application/json', 'application/yaml' ],
          maintainer: 'Hendrik Erz',
          homepage: 'https://www.zettlr.com'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'zettlr',
          bin: 'Zettlr', // See packagerConfig.name property,
          categories: [ 'Office', 'Education', 'Science' ],
          description: 'Your one-stop publication workbench.',
          productDescription: 'Your one-stop publication workbench.',
          productName: 'Zettlr',
          genericName: 'Markdown Editor',
          // Electron forge recommends 512px
          icon: './resources/icons/png/512x512.png',
          license: 'GPL-3.0',
          mimeType: [ 'text/markdown', 'application/x-tex', 'application/json', 'application/yaml' ],
          homepage: 'https://www.zettlr.com'
        }
      }
    },
    {
      name: '@electron-forge/maker-zip'
    }
  ]
}
