// webpack.config.js
const VueLoaderPlugin = require('vue-loader/lib/plugin')
// MiniCssExtractPlugin generates the necessary CSS files for
// our components.
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const path = require('path')

module.exports = {
  entry: {
    sidebar: './resources/vue/sidebar.js'
  },
  target: 'electron-renderer',
  mode: process.env.NODE_ENV,
  devtool: 'none', // Don't use fancy packing which breaks Electron's content policy.
  output: {
    filename: 'vue-[name].js',
    // The target is commonJS so that we can require() the entry points.
    libraryTarget: 'commonjs2',
    // Place the app in the assets directory
    path: path.resolve(__dirname, 'source/renderer/assets/vue'),
    // The common/assets folder is the default publicPath
    publicPath: path.resolve(__dirname, 'source/common/assets')
  },
  module: {
    rules: [
      // AFTER this rule we can add any other rules we may have,
      // b/c vue-loader will split up vue files in three chunks.
      // --> CSS, JS, and the render function (so, basically JS)
      // (Nota bene: Webpack parses bottom-up, so new rules need
      // to be placed ABOVE this one.)
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: false // Disable hot module reloading
            }
          },
          'css-loader'
        ]
      }
    ]
  },
  resolve: {
    alias: {
      // We need to explicitly use the commonJS-version of VueJS
      // to work with stuff like module.exports and require().
      'vue$': 'vue/dist/vue.common.js'
    }
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      // The files will be placed next to the respective components
      // i.e.: vue-sidebar.js will be in the same directory as sidebar.css
      filename: '[name].css',
      ignoreOrder: false // Maybe we need this if the plugin spits out warnings
    })
  ]
}
