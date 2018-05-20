var path = require('path');

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  bail: true,
  cache: true,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      exclude: /node_modules/,
      loader: 'awesome-typescript-loader',
    }],
  }
};
