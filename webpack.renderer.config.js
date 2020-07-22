const rules = require('./webpack.rules')
const plugins = require('./webpack.plugins')

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

module.exports = {
  module: {
    rules
  },
  plugins: plugins,
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.less' ]
  }
}
