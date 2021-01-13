const rules = require('./webpack.rules')
const path = require('path')
const webpack = require('webpack')

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

rules.push({
  test: /\.less$/,
  use: [{
    loader: 'style-loader' // Create style nodes from JS strings
  }, {
    loader: "@teamsupercell/typings-for-css-modules-loader" // Enrich css by typing information
  }, {
    loader: "css-loader" // Translate CSS into JS string
  }, {
    loader: 'less-loader' // Compile Less to CSS
  }],
  exclude: /theme-main\.less$/
})
rules.push({
  test: /theme-main\.less$/, // The themes need to be imported differently
  use: [{
    loader: 'style-loader', // Create style nodes from JS strings
    options: { injectType: 'lazyStyleTag' } // Lazy-load themes so that we can switch between them
  }, {
    loader: "@teamsupercell/typings-for-css-modules-loader" // Enrich css by typing information
  }, {
    loader: "css-loader" // Translate CSS into JS string
  }, {
    loader: 'less-loader' // Compile Less to CSS
  }]
})

// Handle handlebars files: Precompile them
// The precompiled templates can be imported using "require(path to the handlebars fie)"
rules.push({
  test: /\.handlebars$/,
  use: [{
    loader: 'handlebars-loader',
    options: {
      // Automatically load referenced images
      inlineRequires: '/img/',
      // Use custom Handlebars runtime with extra helpers registered
      runtime: path.join(__dirname, 'source/common/zettlr-handlebars-runtime.js')
    }
  }]
})

module.exports = {
  module: {
    rules
  },
  plugins: [
    // Load jQuery
    new webpack.ProvidePlugin({
      '$': 'jquery',
      'jQuery': 'jquery',
      'window.jQuery': 'jquery'
    }),

    // Enhanced typescript support (e.g. moves typescript type checking to separate process)
    new ForkTsCheckerWebpackPlugin(),

    // Apply webpack rules to the corresponding language blocks in .vue files
    new VueLoaderPlugin()
  ],
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.less', '.handlebars' ]
  }
}
