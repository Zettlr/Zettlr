const path = require('path')

// Defines all locations to SVG icon folders. Those must not be loaded as
// resources, but as string literals.
const svgIconFolders = [
  path.resolve(__dirname, 'source/common/modules/window-register/icons'),
  path.resolve(__dirname, 'source/common/modules/markdown-editor/table-editor/icons')
]

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
        // We have a custom element, cds-icon, which Vue shouldn't touch
        isCustomElement: tag => tag === 'cds-icon'
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
    // Most assets can simply be copied over into the output directory, and then
    // used as file assets.
    //
    // * png|jpe?g|svg|gif:   Images
    // * woff2?|eot|ttf|otf:  Fonts
    // * ogg|mp3|wav:         Audio files
    test: /\.(png|jpe?g|svg|gif|woff2?|eot|ttf|otf|ogg|mp3|wav)$/,
    type: 'asset/resource',
    exclude: svgIconFolders
  },
  {
    // Icon SVGs need to be loaded as string literals.
    test: /\.svg$/,
    // NOTE: We're using asset/source, not asset/inline, since "inline" will
    // prepend an SVG-data header which breaks places where the literal SVG
    // is required. Source only loads the file contents as a string literal.
    type: 'asset/source',
    include: svgIconFolders
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
