import path from 'node:path';
import { defineConfig } from 'vite';

const repo = path.resolve(__dirname, '../..');
const src = path.join(repo, 'src');

export default defineConfig({
  root: __dirname,
  esbuild: { jsx: 'automatic' },
  plugins: [
    {
      // 把 Plasmo 的 data-text: / url: 导入换成 Vite 的 ?inline / ?url
      name: 'xhunt-plasmo-schemes',
      enforce: 'pre',
      async resolveId(id, importer) {
        const match = id.match(/^(data-text|url):(.*)$/);
        if (!match) return null;
        const [, scheme, spec] = match;
        const target = spec.replace(/^~\/?/, `${src}/`);
        const resolved = await this.resolve(target, importer, { skipSelf: true });
        if (!resolved) return null;
        return `${resolved.id}?${scheme === 'url' ? 'url' : 'inline'}`;
      },
    },
  ],
  resolve: {
    alias: [
      { find: /^~storage\/useLocalStorage(\.ts)?$/, replacement: path.join(src, 'test/memoryStorage.ts') },
      { find: /^~contents\/hooks\/i18n(\.ts)?$/, replacement: path.join(__dirname, 'i18n.ts') },
      { find: /^~\/?/, replacement: `${src}/` },
    ],
  },
  server: { port: 5199, fs: { allow: [repo] } },
});
