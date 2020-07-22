module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './source/main.ts',
  module: {
    rules: require('./webpack.rules')
  },
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ]
  },
  externals: {
    // Do not embed fsevents (otherwise this leads to problems on Linux and Windows, see https://github.com/paulmillr/chokidar/issues/618#issuecomment-392618390)
    'fsevents': "require('fsevents')"
  }
}
