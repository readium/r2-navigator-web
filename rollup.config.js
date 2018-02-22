import typescript2 from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import execute from 'rollup-plugin-execute';

const pkg = require('./package.json');

export default {
  input: './src/navigator/index.ts',
  output: [
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
    {
      file: pkg.main,
      format: 'umd',
      name: 'readiumNg',
      sourcemap: true,
      globals: {
        'readium-shared-js': 'readiumSharedJs',
        'r2-shared-js': 'r2SharedJs'
      }
    }
  ],
  external: [
    'readium-shared-js',
    'r2-shared-js'
  ],
  plugins: [
    resolve(),
    typescript2(),
    execute('dts-bundle --configJson dts-bundle.json')
  ]
};