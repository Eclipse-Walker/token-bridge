import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: ['node 18'],
      dts: true,
    },
    {
      format: 'cjs',
      syntax: ['node 18'],
    },
  ],
  source: {
    tsconfigPath: './tsconfig.json',
  },
  output: {
    minify: true,
    sourceMap: true,
    externals: ['zustand', 'idb-keyval', 'axios'],
  },
});
