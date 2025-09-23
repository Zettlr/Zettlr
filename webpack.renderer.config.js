const rules = require('./webpack.rules')
const path = require('path')

const { VueLoaderPlugin } = require('vue-loader')
const { DefinePlugin } = require('webpack')

const plugins = [
  // Apply webpack rules to the corresponding language blocks in .vue files
  new VueLoaderPlugin(),

  // Set a few Vue 3 options; see: http://link.vuejs.org/feature-flags
  new DefinePlugin({
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false, // New in Vue 3.4
    // Quote from the docs: "Note that because the plugin does a direct text
    // replacement, the value given to it must include actual quotes inside of
    // the string itself. Typically, this is done either with alternate quotes,
    // such as '"production"', or by using JSON.stringify('production')."
    __GIT_COMMIT_HASH__: JSON.stringify(process.env.GIT_COMMIT_HASH),
    __BUILD_DATE__: JSON.stringify((new Date()).toISOString())
  })
]

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
  module: { rules },
  // The following line of code serves two purposes: While we're in develop
  // (NODE_ENV = develop), emit source maps so we have an easy time finding the
  // origin of bugs or performance bottlenecks. But since source maps are a
  // whopping 60MB large at the time of writing (July 2021), we disable these
  // in production (i.e. when we ship to users). NOTE, however, that these env-
  // variables must be set, which we're doing using cross-env in package.json.
  devtool: (process.env.NODE_ENV === 'production') ? false : 'source-map',
  plugins,
  resolve: {
    extensions: [
      '.js', '.ts', '.jsx', '.tsx',
      '.css', '.less', '.vue'
    ],
    alias: {
      source: [path.resolve(__dirname, 'source')],
      '@common': [path.resolve(__dirname, 'source/common')],
      '@providers': [path.resolve(__dirname, 'source/app/service-providers')],
      '@dts': [path.resolve(__dirname, 'source/types')]
    },
    fallback: {
      // Don't polyfill these modules
      path: false,
      fs: false
    }
  }
}
