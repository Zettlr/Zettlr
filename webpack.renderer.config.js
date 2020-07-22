const rules = require('./webpack.rules')
const plugins = require('./webpack.plugins')
const path = require('path')

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'vue-loader' }]
})
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

module.exports = {
  module: {
    rules
  },
  plugins: plugins,
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.less', '.handlebars' ]
  }
}
