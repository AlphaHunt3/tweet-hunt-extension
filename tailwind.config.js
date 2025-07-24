module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // 生产环境优化
  ...(process.env.NODE_ENV === 'production' && {
    // 移除 safelist，因为这些都是自定义 CSS 类，不是 Tailwind 工具类
    // theme-*, xhunt-*, tippy-*, floating-* 都是在 CSS 文件中定义的自定义类
    // Tailwind 的 purge 功能不会移除这些类，因为它们不是 Tailwind 的工具类
  })
}