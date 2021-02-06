
const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.join(__dirname, 'utils.js'),
  output: {
    path: __dirname,
    filename: 'utils.bundle.js',
    library: 'utils',
    libraryTarget: 'umd',
  },
  target: 'web',
  optimization: {
    minimize: true,
  },
};
