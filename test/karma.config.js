process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai'],
    files: [
      'dist/bundle.js',
      {pattern: 'fixtures/**/*.*',  watched: false, included: false, served: true, nocache: false}
    ],
    proxies: {
      "/fixtures": "/base/fixtures"
    },
    customLaunchers: {
      ChromeHeadlessWithSizeDefined: {
        base: 'ChromeHeadless',
        flags: ['--window-size=1024,768', , '--no-sandbox']
      }
    },
    reporters: ['spec'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadlessWithSizeDefined'],
    singleRun: true,
    concurrency: Infinity
  })
}