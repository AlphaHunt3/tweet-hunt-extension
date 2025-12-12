const { defineConfig } = require('plasmo');

module.exports = defineConfig({
  // 扩展权限配置 - 尝试不同的格式
  manifest: {
    permissions: ['storage', 'scripting', 'idle'],
    host_permissions: ['https://x.com/*'],
    action: {
      default_popup: undefined,
    },
  },

  // 构建优化配置
  build: {
    // 生产环境启用压缩
    minify: true,

    // 启用源码映射（开发环境）
    sourcemap: false,

    // 优化输出目录结构
    outDir: 'build',

    // 移除控制台日志（生产环境）
    removeConsole: true,
  },

  // 开发服务器配置
  devServer: {
    // 启用热重载
    hot: true,
    // 端口配置
    port: 1947,
    // 主机配置
    host: 'localhost',
  },

  // 环境变量配置
  env: {
    // 根据环境设置不同的配置
    ...{
      // 生产环境特定配置
      PLASMO_PUBLIC_GTAG_ID: process.env.PLASMO_PUBLIC_GTAG_ID,
    },
  },

  // 自定义打包优化
  bundleConfig: {
    // 生产环境优化
    ...{
      // 启用代码分割
      splitting: true,

      // 启用 Tree Shaking
      treeShaking: true,

      // 压缩配置
      minify: {
        // 压缩 JavaScript
        js: true,
        // 压缩 CSS
        css: true,
        // 压缩 HTML
        html: true,
      },

      // 优化图片
      imageOptimization: {
        // 启用图片压缩
        enabled: true,
        // 图片质量
        quality: 85,
        // 支持的格式
        formats: ['webp', 'png', 'jpg'],
      },
    },
  },
});
