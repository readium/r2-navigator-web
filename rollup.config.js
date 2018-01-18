export default {
  input: './build_temp/src/navigator/index.js',
  output: {
    file: 'dist/readium-ng.js',
    format: 'cjs',
    name: 'readium-ng'
  },
  external: [ 'ta-json', 'jquery', 'readium-shared-js' ]
};