const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './source/main.ts',
  module: {
    rules: require('./webpack.rules')
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'source/main/assets/tutorial', to: 'tutorial' },
        { from: 'source/main/assets/dict', to: 'dict' },
        { from: 'source/common/lang', to: 'lang' },
        { from: 'source/app/service-providers/assets/csl-locales', to: 'assets/csl-locales' },
        { from: 'source/app/service-providers/assets/csl-styles', to: 'assets/csl-styles' },
        { from: 'source/app/service-providers/assets/defaults', to: 'assets/defaults' },
        { from: 'source/main/modules/export/assets/export.tpl.htm', to: 'assets' },
        { from: 'source/main/modules/export/assets/template.revealjs.htm', to: 'assets' },
        { from: 'source/main/modules/export/assets/revealjs-styles', to: 'assets/revealjs-styles' }
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
