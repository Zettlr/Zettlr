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
  }]
})
rules.push({
  test: /\.handlebars$/,
  use: [{
    loader: 'handlebars-loader',
    options: {
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
