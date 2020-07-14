const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = [
  new ForkTsCheckerWebpackPlugin(),
  new VueLoaderPlugin()
]
