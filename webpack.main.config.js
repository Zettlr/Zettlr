module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './source/main.ts',
  module: {
    rules: require('./webpack.rules')
  },
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ]
  }
}
