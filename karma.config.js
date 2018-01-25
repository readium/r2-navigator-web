module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai'],
    files: [
      'build_test_temp/test_bundle.js',
      {pattern: 'test/fixtures/**/*.*',  watched: false, included: false, served: true, nocache: false},
      {pattern: 'lib/**/*.*',  watched: false, included: false, served: true, nocache: false},
    ],
    proxies: {
      "/fixtures/publications": "/base/test/fixtures/publications",
      "/lib": "/base/lib"
    },
    customLaunchers: {
      ChromeHeadlessWithSizeDefined: {
        base: 'ChromeHeadless',
        flags: ['--window-size=800,600']
      }
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadlessWithSizeDefined'],
    singleRun: true,
    concurrency: Infinity
  })
}