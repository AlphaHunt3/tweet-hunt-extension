import path from 'node:path';
import { defineConfig } from 'vitest/config';

const src = path.resolve(__dirname, 'src');
const SCHEME = '\0plasmo-scheme:';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [
    {
      // Plasmo 的 data-text: / url: 导入在测试里换成空字符串和占位 URL
      name: 'xhunt-plasmo-schemes',
      enforce: 'pre',
      resolveId(id) {
        if (id.startsWith('data-text:') || id.startsWith('url:')) return SCHEME + id;
        return null;
      },
      load(id) {
        if (!id.startsWith(SCHEME)) return null;
        const spec = id.slice(SCHEME.length);
        const value = spec.startsWith('url:') ? `stub://${spec.slice(4)}` : '';
        return `export default ${JSON.stringify(value)};`;
      },
    },
  ],
  resolve: {
    alias: [{ find: /^~\/?/, replacement: `${src}/` }],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
