const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')
const rules = require('./webpack.rules')

module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './source/main.ts',
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
        // { from: 'static/export.tpl.htm', to: 'assets' }, // DEPRECATED
        { from: 'static/template.revealjs.htm', to: 'assets' },
        { from: 'static/revealjs-styles', to: 'assets/revealjs-styles' },
        { from: 'static/lua-filter', to: 'assets/lua-filter' },
        { from: 'resources/icons/icon.ico', to: 'assets/icons' },
        { from: 'resources/icons/png', to: 'assets/icons/png' }
      ]
    })
  ],
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ],
    alias: {
      // NOTE: The following alias is necessary since we have two versions of
      // readable-stream installed. Archiver needs (transitively via lazystream)
      // an older version which yarn will install into the node_modules of
      // lazystream (whereas the newer version is installed directly under
      // ./node_modules). However, webpack apparently follows a top-down
      // module resolution strategy, which explains why VS Code is able to
      // resolve the following require easily, while webpack always complains it
      // doesn't exist. This alias provides a hard-coded map to the correct
      // module so that webpack compiles successfully. Please NOTE that we should
      // get rid of this asap, but that's going to happen only if archiver updates
      // or if we find a replacement.
      'readable-stream/passthrough': [
        path.resolve(__dirname, 'node_modules/lazystream/node_modules/readable-stream/')
      ]
    }
  },
  externals: {
    // Do not embed fsevents (otherwise this leads to problems on Linux and Windows, see https://github.com/paulmillr/chokidar/issues/618#issuecomment-392618390)
    'fsevents': "require('fsevents')"
  }
}
