const path = require('path');
const webpack = require('webpack');

module.exports = {
    context: path.resolve(__dirname, './'),
    devtool: 'inline-source-map',
    mode: 'development',
    module: {
        rules: [{
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/
        }]
    },
    output: {
      filename: "connlib.js"
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js']
    },
    externals: {
        "react": "React",
        "react-dom": "ReactDOM"
    }
};