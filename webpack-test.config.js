module.exports = {
    context: __dirname,
    devtool: "inline-source-map",
    entry: "./build_test_temp/test/streamer-client-test.js",
    output: {
      path: __dirname + "/build_test_temp",
      filename: "test_bundle.js"
    }
};