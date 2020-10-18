const CopyWebpackPlugin = require('copy-webpack-plugin')

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
        { from: 'source/app/service-providers/assets/csl-locales', to: 'assets/csl-locales' },
        { from: 'source/app/service-providers/assets/csl-styles', to: 'assets/csl-styles' }
      ]
    })
  ],
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ]
  },
  externals: {
    // Do not embed fsevents (otherwise this leads to problems on Linux and Windows, see https://github.com/paulmillr/chokidar/issues/618#issuecomment-392618390)
    'fsevents': "require('fsevents')"
  }
}
