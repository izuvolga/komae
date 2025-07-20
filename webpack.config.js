const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const rendererConfig = {
  name: 'renderer',
  mode: process.env.NODE_ENV || 'development',
  entry: './src/index.tsx',
  target: 'web',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json'
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'build/renderer'),
    filename: 'renderer.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    fallback: {
      "global": false
    }
  },
  devServer: {
    port: 3000,
    hot: true
  }
};

const mainConfig = {
  name: 'main',
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main.ts',
  target: 'electron-main',
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.electron.json'
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'build/main'),
    filename: 'main.js'
  }
};

const preloadConfig = {
  name: 'preload',
  mode: process.env.NODE_ENV || 'development',
  entry: './src/preload.ts',
  target: 'electron-preload',
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.electron.json'
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, 'build/main'),
    filename: 'preload.js'
  }
};

module.exports = [rendererConfig, mainConfig, preloadConfig];