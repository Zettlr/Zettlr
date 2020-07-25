const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = [
  new ForkTsCheckerWebpackPlugin(),

  // Apply webpack rules to the corresponding language blocks in .vue files
  new VueLoaderPlugin()
]
