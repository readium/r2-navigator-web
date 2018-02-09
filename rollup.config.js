import typescript2 from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import execute from 'rollup-plugin-execute';

const pkg = require('./package.json');

export default {
  input: './src/navigator/index.ts',
  output: [{
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
        'readium-shared-js': 'readiumSharedJs'
      }
    }
  ],
  external: ['readium-shared-js'],
  // 'ta-json' is not made external because of the "dependencies" for the 'globals' in UMD output.
  //   Someone importing this UMD module with the 'globals' option
  //   would find it hard to include 'ta-json'
  //   because it only publishes itself as CommonJS at this time.
  plugins: [
    resolve(),
    typescript2(),
    execute('dts-bundle --configJson dts-bundle.json')
  ]
};