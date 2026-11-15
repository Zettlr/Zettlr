const CopyWebpackPlugin = require('copy-webpack-plugin')
const { DefinePlugin } = require('webpack')
const path = require('path')
const rules = require('./webpack.rules')

module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './source/main.ts',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  module: { rules },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // These are all static files that simply need to be bundled with the
        // application; we'll just copy them over from the static folder.
        { from: 'static/tutorial', to: 'tutorial' },
        { from: 'static/dict', to: 'dict' },
        { from: 'static/lang', to: 'lang' },
        { from: 'static/csl-locales', to: 'assets/csl-locales' },
        { from: 'static/csl-styles', to: 'assets/csl-styles' },
        { from: 'static/defaults', to: 'assets/defaults' },
        { from: 'static/lua-filter', to: 'assets/lua-filter' },
        { from: 'resources/icons/icon.ico', to: 'assets/icons' },
        { from: 'resources/icons/png', to: 'assets/icons/png' },
        { from: 'resources/icons/macOS-menubar', to: 'assets/icons/macOS-menubar' }
      ]
    }),
    new DefinePlugin({
      __GIT_COMMIT_HASH__: JSON.stringify(process.env.GIT_COMMIT_HASH),
      __BUILD_DATE__: JSON.stringify((new Date()).toISOString()),
      __UPDATES_DISABLED__: JSON.stringify(process.env.ZETTLR_DISABLE_UPDATE_CHECK !== undefined ? '1' : '0')
    })
  ],
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ],
    alias: {
      source: [path.resolve(__dirname, 'source')],
      '@common': [path.resolve(__dirname, 'source/common')],
      '@providers': [path.resolve(__dirname, 'source/app/service-providers')],
      '@dts': [path.resolve(__dirname, 'source/types')]
    }
  },
}
