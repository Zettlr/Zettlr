module.exports = {
  'packagerConfig': {
    'asar': true,
    'darwinDarkModeSupport': 'true',
    // Electron-forge automatically adds the file extension based on OS
    'icon': './resources/icons/icon',
    // The binary name should always be uppercase Zettlr. As we cannot specify
    // this on a per-maker basis, we need to output everything this way. With
    // this property, macOS builds are named Zettlr.app, Windows builds
    // Zettlr.exe and the linux binaries are called Zettlr (albeit on Linux,
    // lowercase is preferred). Due to the last issue (Linux binaries being
    // with capital Z) we have to explicitly set executableName on the Linux
    // target.
    'name': 'Zettlr',
    // The certificate is written to the default keychain during CI build.
    // See ./scripts/add-osx-cert.sh
    'osxSign': {
      'identity': 'Developer ID Application: Hendrik Erz (QS52BN8W68)',
      'hardened-runtime': true,
      'gatekeeper-assess': false,
      'entitlements': 'scripts/assets/entitlements.plist',
      'entitlements-inherit': 'scripts/assets/entitlements.plist',
      'signature-flags': 'library'
    },
    'osxNotarize': {
      'appleId': process.env['APPLE_ID'],
      'appleIdPassword': process.env['APPLE_ID_PASS'],
    }
  },
  'plugins': [
    [
      '@electron-forge/plugin-webpack',
      {
        'mainConfig': './webpack.main.config.js',
        'renderer': {
          'config': './webpack.renderer.config.js',
          'entryPoints': [
            {
              'html': './source/renderer/assets/index.htm',
              'js': './source/renderer/renderer.ts',
              'name': 'main_window'
            },
            {
              'html': './source/print/index.htm',
              'js': './source/print/zettlr-print-window.ts',
              'name': 'print'
            },
            {
              'html': './source/log-viewer/index.htm',
              'js': './source/log-viewer/index.js',
              'name': 'log_viewer'
            },
            {
              'html': './source/quicklook/index.htm',
              'js': './source/quicklook/zettlr-quicklook-window.ts',
              'name': 'quicklook'
            }
          ]
        }
      }
    ]
  ]
}
