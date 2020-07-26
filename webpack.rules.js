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
      loader: '@marshallofsound/webpack-asset-relocator-loader',
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
      'css-loader'
    ]
  },
  {
    // Handle picture files: just copy them
    test: /\.(png|svg|jpg|gif)$/,
    use: [
      'file-loader'
    ]
  },
  {
    // Handle font files: just copy them
    test: /\.(woff|woff2|eot|ttf|otf)$/,
    use: [
      'file-loader'
    ]
  },
  {
    // Handle files for citeproc: copy them, and import them as string
    test: /\.(xml|csl)$/,
    use: [
      'raw-loader'
    ]
  },
  {
    // Handle audio files: just copy them
    test: /\.(ogg)$/,
    use: [
      'file-loader'
    ]
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
