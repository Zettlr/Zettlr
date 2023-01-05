const path = require('path')

module.exports = [
  // Add support for native node modules
  {
    // Apparently just checking for .node modules is not enough since we need
    // the actual fsevents.node to trigger a rebuild of the module into the
    // Electron binary and webpack will create a .node-file that just LINKS to
    // the correct (actual) fsevents.node. Without the `native_modules`, a
    // rebuild will never commence, and hence fsevents will remain unavailable
    // on macOS
    test: /native_modules\/.+\.node$/,
    loader: 'node-loader'
  },
  {
    test: /\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules'
      }
    }
  },
  {
    test: /\.vue$/,
    loader: 'vue-loader',
    options: {
      compilerOptions: {
        // We have a custom element, clr-icon, which Vue shouldn't touch
        isCustomElement: tag => tag === 'clr-icon'
      }
    }
  },
  {
    test: /\.css$/,
    use: [
      'style-loader',
      'css-loader'
    ]
  },
  {
    // Most assets can simply be copied over into the output directory:
    // * png|jpe?g|svg|gif:   Images
    // * woff2?|eot|ttf|otf:  Fonts
    // * ogg|mp3|wav:         Audio files
    test: /\.(png|jpe?g|svg|gif|woff2?|eot|ttf|otf|ogg|mp3|wav)$/,
    type: 'asset/resource',
    exclude: [
      // We exclude the custom clarity icons here, since clarity expects string
      // literals, not file paths
      path.resolve(__dirname, 'source/common/modules/window-register/icons')
    ]
  },
  {
    test: /\.svg$/,
    type: 'asset/source',
    include: [
      // NOTE: We're using asset/source, not asset/inline, since "inline" will
      // prepend an SVG-data header which breaks clarity. Source works with
      // literal strings.
      path.resolve(__dirname, 'source/common/modules/window-register/icons')
    ]
  },
  {
    test: /(.ts|.tsx)$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
        appendTsSuffixTo: [/\.vue$/] // Enable ts support in Vue SFCs
      }
    }
  }
]
