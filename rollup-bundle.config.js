import typescript2 from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import execute from 'rollup-plugin-execute';
import json from 'rollup-plugin-json';

const pkg = require('./package.json');

export default {
  input: './src/index.ts',
  output: [
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    resolve(),
    commonjs({
      namedExports: {
        '../readium-shared-js/build-output/_umd-bundle/readium-shared-js.js': [ 'ViewerSettings', 'Package', 'OnePageView', 'PaginationChangedEventArgs', 'ReflowableView', 'StyleCollection' ]
      }
    }),
    json(),
    typescript2(),
    execute('dts-bundle --configJson dts-bundle.json')
  ]
};