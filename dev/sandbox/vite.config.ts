import path from 'node:path';
import { defineConfig } from 'vite';

const repo = path.resolve(__dirname, '../..');
const src = path.join(repo, 'src');

export default defineConfig({
  root: __dirname,
  esbuild: { jsx: 'automatic' },
  // Plasmo 打包时会注入 process.env，Vite 不会
  define: { 'process.env': JSON.stringify({ NODE_ENV: 'development' }) },
  plugins: [
    {
      // 把 Plasmo 的 data-text: / url: 导入换成 Vite 的 ?inline / ?url
      name: 'xhunt-plasmo-schemes',
      enforce: 'pre',
      async resolveId(id, importer) {
        const match = id.match(/^(data-text|url):(.*)$/);
        if (!match) return null;
        const [, scheme, spec] = match;
        // Plasmo 把 ~/assets 解析到仓库根目录的 assets/，其余 ~ 指向 src/
        const target = spec.replace(/^~\/?assets\//, `${repo}/assets/`).replace(/^~\/?/, `${src}/`);
        const resolved = await this.resolve(target, importer, { skipSelf: true });
        if (!resolved) return null;
        return `${resolved.id}?${scheme === 'url' ? 'url' : 'inline'}`;
      },
    },
    {
      // 接口层和远程配置换成沙盒假数据；假实现自己引用真实文件时不再重定向
      name: 'xhunt-sandbox-mocks',
      enforce: 'pre',
      async resolveId(id, importer) {
        if (!importer || importer.includes('/dev/sandbox/mocks/')) return null;
        if (!/services\/(api|review)|nacosCacheManager/.test(id)) return null;
        const resolved = await this.resolve(id, importer, { skipSelf: true });
        if (!resolved) return null;
        const mocks: Record<string, string> = {
          'src/contents/services/api.ts': 'mocks/api.ts',
          'src/contents/services/review.ts': 'mocks/review.ts',
          'src/utils/nacosCacheManager.ts': 'mocks/nacos.ts',
        };
        const hit = Object.keys(mocks).find((real) => resolved.id.endsWith(real));
        return hit ? path.join(__dirname, mocks[hit]) : null;
      },
    },
  ],
  resolve: {
    alias: [
      { find: /^~contents\/hooks\/i18n(\.ts)?$/, replacement: path.join(__dirname, 'i18n.ts') },
      { find: /^~contents\/hooks\/usePlacementTracking(\.ts)?$/, replacement: path.join(__dirname, 'mocks/placement.ts') },
      { find: /^~\/?/, replacement: `${src}/` },
    ],
  },
  server: { port: 5199, fs: { allow: [repo] } },
});
