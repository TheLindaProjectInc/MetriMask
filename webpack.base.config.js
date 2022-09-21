const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const autoprefixer = require('autoprefixer');

const styleLoaders = {
  fallback: {
    loader: require.resolve('style-loader'),
  },
  use: [
    {
      loader: require.resolve('css-loader'),
      options: {
        importLoaders: 1,
        minimize: true,
      },
    },
    {
      loader: require.resolve('postcss-loader'),
      options: {
        // Necessary for external CSS imports to work
        // https://github.com/facebookincubator/create-react-app/issues/2677
        postcssOptions: {
          plugins: () => [
             require('postcss-flexbugs-fixes'),
            autoprefixer({
              flexbox: 'no-2009',
            }),
          ],
	},
      },
    },'sass-loader'
  ],
}

const options = {
  extensions: [`.ts`, `.tsx`],
  files: [ path.resolve(__dirname, './src') ]
}

module.exports = {
  entry: {
    background: './src/background/index.ts',
    contentscript: './src/contentscript/index.ts',
    inpage: './src/inpage/index.ts',
    popup: './src/popup/index.tsx',
    scryptworker: './src/background/workers/scryptworker.js',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    // @see https://developer.chrome.com/extensions/manifest/web_accessible_resources
    publicPath : 'chrome-extension://__MSG_@@extension_id__/',
  },
  resolve: {
    //alias: {
    //  "process": "process/browser",
    //},
    //fallback: {
    //  process: require.resolve("process"),
    //  buffer: require.resolve("buffer"),
    //  url: require.resolve("url"),
    //  stream: require.resolve("stream-browserify"),
    //  crypto: require.resolve("crypto-browserify"),
    //  assert: require.resolve("assert")
    //},
    extensions: [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
    ],
  },
  module: {
    rules: [
      {
        oneOf: [
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
	    type: 'asset/resource',
            generator: {
              limit: 10000,
              filename: 'static/[name].[hash:8].[ext]',
            },
          },
          {
            test: /\.(ts|tsx)$/,
            loader: 'ts-loader',
          },
          {
            exclude: /node_modules/,
            test: /\.s?css$/,
//	    use: ['style-loader', 'css-loader', 'postcss-loader'],
            use: [MiniCssExtractPlugin.loader, 'css-loader'],
          },
        ],
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      linkType: false,
      filename: '[name].css',
    }),
    new CopyWebpackPlugin([
      { from: 'static' },
    ]),
    new ESLintPlugin(options),
    new NodePolyfillPlugin(),
    //new webpack.ProvidePlugin({
    //  process: 'process/browser',
    //  Buffer: ['buffer', 'Buffer'],
    //}),
  ],
}
