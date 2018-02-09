const glob = require("glob");
const path = require("path");

module.exports = {
  context: __dirname,
  devtool: "inline-source-map",
  entry: glob.sync('./**/*.spec.ts'),
  output: {
    path: __dirname + "/dist",
    filename: "bundle.js"
  },
  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".json"]
  },
  module: {
    rules: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      },

      // Not used until 'readium-shared-js' has a source map
      // // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      // {
      //   enforce: "pre",
      //   test: /\.js$/,
      //   loader: "source-map-loader",
      //   exclude: [
      //     // this package has issues with this loader
      //     path.resolve(__dirname,"../node_modules/ta-json")
      //   ]
      // }
    ]
  }
};