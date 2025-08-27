const path = require('path');

module.exports = {
  webpack: {
    configure: {
      devtool: 'eval-source-map',
      resolve: {
        alias:{
          src: path.resolve(__dirname, 'src')
        }
      }
    }
  }
}
