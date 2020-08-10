module.exports = {
  'packagerConfig': {
    'asar': true,
    'icon': './resources/icons/icon', // Automatically adds file extension based on OS
    'name': 'Zettlr'
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
            }
          ]
        }
      }
    ]
  ]
}
