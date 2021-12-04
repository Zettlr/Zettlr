const path = require('path')

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
      '@teamsupercell/typings-for-css-modules-loader',
      'css-loader'
    ]
  },
  {
    test: /\.(png|jpg|svg|gif)$/,
    type: 'asset/resource',
    exclude: [
      // Clarity expects inline SVG, so we cannot handle them as resources.
      path.resolve(__dirname, 'source/common/modules/window-register/icons')
    ]
  },
  {
    test: /\.svg$/,
    use: ['svg-inline-loader'],
    include: [
      // Make sure to only inline the icons for Clarity. Other SVGs will be
      // handled regularly as resources.
      path.resolve(__dirname, 'source/common/modules/window-register/icons')
    ]
  },
  {
    test: /\.(woff|woff2|eot|ttf|otf)$/,
    type: 'asset/resource'
  },
  {
    // Handle audio files: just copy them
    test: /\.(ogg|mp3|wav)$/,
    use: {
      loader: 'file-loader',
      options: {
        // Do not wrap in js module
        esModule: false,
        name: '[path][name].[ext]',
        // Forge puts the entry points in their own dedicated directory, so we
        // have to "manually" move up from that directory again
        publicPath: '..',
        // The main context is our source directory. The resources are only
        // important for handlebars, but not for anything else.
        context: 'source'
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
