module.exports = {
  'packagerConfig': {
    'asar': true,
    'darwinDarkModeSupport': 'true',
    'icon': './resources/icons/icon', // Automatically adds file extension based on OS
    'name': 'Zettlr',
    // The certificate is written to the default keychain during CI build.
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
              'js': './source/print/zettlr-print-window.js',
              'name': 'print'
            },
            {
              'html': './source/log-viewer/index.htm',
              'js': './source/log-viewer/index.js',
              'name': 'log_viewer'
            },
            {
              'html': './source/quicklook/index.htm',
              'js': './source/quicklook/zettlr-quicklook-window.js',
              'name': 'quicklook'
            }
          ]
        }
      }
    ]
  ]
}
