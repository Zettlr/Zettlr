// webpack.config.js
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const path = require('path')
const webpack = require('webpack')

var configuration = {
  entry: {
    sidebar: './resources/vue/sidebar.js'
  },
  target: 'electron-renderer',
  mode: process.env.NODE_ENV,
  devtool: 'cheap-module-source-map',
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
      {
        test: /\.(js|vue)$/,
        enforce: 'pre',
        exclude: /node_modules/,
        loader: 'eslint-loader'
      },
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ]
      },
      // BEFORE this rule we can add any other rules we may have,
      // b/c vue-loader will split up vue files in three chunks.
      // --> CSS, JS, and the render function (so, basically JS)
      // (Nota bene: Webpack parses bottom-up, so new rules need
      // to be placed ABOVE this one.)
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader',
          options: {
            extractCSS: process.env.NODE_ENV === 'production'
          }
        }
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
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin()
  ]
}

if (process.env.NODE_ENV === 'production') {
  // Don't emit sourcemaps
  configuration.devtool = ''

  configuration.plugins.push(
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  )
}

module.exports = configuration
