const glob = require("glob");

module.exports = {
    context: __dirname,
    devtool: "inline-source-map",
    entry: glob.sync('./build_test_temp/test/*.js'),
    output: {
      path: __dirname + "/build_test_temp",
      filename: "test_bundle.js"
    }
};