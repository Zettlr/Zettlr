const rules = require('./webpack.rules')

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

rules.push({
  test: /\.less$/,
  use: [{
    loader: 'style-loader' // Create style nodes from JS strings
  }, {
    loader: '@teamsupercell/typings-for-css-modules-loader' // Enrich css by typing information
  }, {
    loader: 'css-loader' // Translate CSS into JS string
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
    loader: '@teamsupercell/typings-for-css-modules-loader' // Enrich css by typing information
  }, {
    loader: 'css-loader' // Translate CSS into JS string
  }, {
    loader: 'less-loader' // Compile Less to CSS
  }]
})

module.exports = {
  module: { rules },
  // The following line of code serves two purposes: While we're in develop
  // (NODE_ENV = develop), emit source maps so we have an easy time finding the
  // origin of bugs or performance bottlenecks. But since source maps are a
  // whopping 60MB large at the time of writing (July 2021), we disable these
  // in production (i.e. when we ship to users). NOTE, however, that these env-
  // variables must be set, which we're doing using cross-env in package.json.
  devtool: (process.env.NODE_ENV === 'production') ? false : 'source-map',
  plugins: [
    // Enhanced typescript support (e.g. moves typescript type checking to separate process)
    new ForkTsCheckerWebpackPlugin(),

    // Apply webpack rules to the corresponding language blocks in .vue files
    new VueLoaderPlugin()
  ],
  resolve: {
    extensions: [
      '.js', '.ts', '.jsx', '.tsx',
      '.css', '.less', '.vue'
    ],
    fallback: {
      // Don't polyfill these modules
      path: false,
      fs: false
    }
  }
}
