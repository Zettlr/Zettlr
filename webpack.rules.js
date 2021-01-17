module.exports = [
  // Add support for native node modules
  {
    test: /\.node$/,
    use: 'node-loader'
  },
  {
    test: /\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@zeit/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules'
      }
    }
  },
  {
    test: /\.vue$/,
    loader: 'vue-loader'
  },
  {
    test: /\.css$/,
    use: [
      'vue-style-loader',
      '@teamsupercell/typings-for-css-modules-loader',
      'css-loader'
    ]
  },
  {
    // Handle picture files: just copy them
    test: /\.(png|svg|jpg|gif)$/,
    use: {
      loader: 'file-loader',
      options: {
        // Do not wrap in js module (important for handlebars)
        esModule: false,
        name: "[path][name].[ext]",
        // Forge puts the entry points in their own dedicated directory, so we
        // have to "manually" move up from that directory again
        publicPath: "..",
        // The main context is our source directory. The resources are only
        // important for handlebars, but not for anything else.
        context: "source"
      }
    }
  },
  {
    // Handle font files: just copy them
    test: /\.(woff|woff2|eot|ttf|otf)$/,
    use: {
      loader: 'file-loader',
      options: {
        // Do not wrap in js module
        esModule: false,
        name: "[path][name].[ext]",
        // Forge puts the entry points in their own dedicated directory, so we
        // have to "manually" move up from that directory again
        publicPath: "..",
        // The main context is our source directory. The resources are only
        // important for handlebars, but not for anything else.
        context: "source"
      }
    }
  },
  {
    // Handle audio files: just copy them
    test: /\.(ogg)$/,
    use: {
      loader: 'file-loader',
      options: {
        // Do not wrap in js module
        esModule: false,
        name: "[path][name].[ext]",
        // Forge puts the entry points in their own dedicated directory, so we
        // have to "manually" move up from that directory again
        publicPath: "..",
        // The main context is our source directory. The resources are only
        // important for handlebars, but not for anything else.
        context: "source"
      }
    }
  },
  {
    // Handle files for citeproc: copy them, and import them as string
    test: /\.(xml|csl)$/,
    use: {
      loader: 'raw-loader',
      options: {
        // Do not wrap in js module
        esModule: false
      }
    }
  },
  {
    test: /(.ts|.tsx)$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true
      }
    }
  }
]
