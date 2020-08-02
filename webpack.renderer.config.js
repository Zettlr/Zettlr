const rules = require('./webpack.rules')
const plugins = require('./webpack.plugins')
const path = require('path')
const webpack = require('webpack')

rules.push({
  test: /\.less$/,
  use: [{
    loader: 'style-loader' // Create style nodes from JS strings
  }, {
    loader: 'css-loader' // Translate CSS into JS string
  }, {
    loader: 'less-loader' // Compile Less to CSS
  }],
  exclude: /theme-main\.less$/
})
rules.push({
  test: /theme-main\.less$/,
  use: [{
    loader: 'style-loader', // Create style nodes from JS strings
    options: { injectType: 'lazyStyleTag' } // Lazy-load themes so that we can switch between them
  }, {
    loader: 'css-loader' // Translate CSS into JS string
  }, {
    loader: 'less-loader' // Compile Less to CSS
  }]
})
rules.push({
  test: /\.handlebars$/,
  use: [{
    loader: 'handlebars-loader',
    options: {
      // Automatically load referenced images
      inlineRequires: '/img/',
      // Use custom Handlebars runtime with extra helpers registered
      runtime: path.join(__dirname, 'source/common/zettlr-template.js')
    }
  }]
})

// Load jQuery
plugins.push(new webpack.ProvidePlugin({
  '$': 'jquery',
  'jQuery': 'jquery',
  'window.jQuery': 'jquery'
}))

module.exports = {
  module: {
    rules
  },
  plugins: plugins,
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.less', '.handlebars' ]
  }
}
