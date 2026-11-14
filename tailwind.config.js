const twitterBlue = {
  50: '#E8F5FD',
  100: '#D7EDFF',
  200: '#B8DCF8',
  300: '#8ECDF8',
  400: '#1D9BF0',
  500: '#1D9BF0',
  600: '#1A8CD8',
  700: '#1577B8',
  800: '#0F5F92',
  900: '#0B4A73',
  950: '#062D46',
};

module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx}', './public/**/*.html'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        blue: twitterBlue,
        'xhunt-accent': {
          DEFAULT: twitterBlue[500],
          hover: twitterBlue[600],
          soft: twitterBlue[50],
        },
        xh: {
          canvas: 'var(--xh-canvas)',
          raised: 'var(--xh-raised)',
          surface: 'var(--xh-surface)',
          sunken: 'var(--xh-sunken)',
          line: 'var(--xh-line)',
          fg: 'var(--xh-fg)',
          'fg-2': 'var(--xh-fg-2)',
          'fg-3': 'var(--xh-fg-3)',
          accent: 'var(--xh-accent)',
          'accent-soft': 'var(--xh-accent-soft)',
          'accent-fg': 'var(--xh-accent-fg)',
          'on-accent': 'var(--xh-on-accent)',
          up: 'var(--xh-up)',
          'up-bg': 'var(--xh-up-bg)',
          down: 'var(--xh-down)',
          'down-bg': 'var(--xh-down-bg)',
          warn: 'var(--xh-warn)',
          'warn-bg': 'var(--xh-warn-bg)',
        },
      },
      borderRadius: {
        'xh-panel': 'var(--xh-radius-panel)',
        'xh-card': 'var(--xh-radius-card)',
        'xh-control': 'var(--xh-radius-control)',
      },
      boxShadow: {
        'xh-panel': 'var(--xh-shadow-panel)',
        'xh-pop': 'var(--xh-shadow-pop)',
      },
      fontFamily: {
        'xh-ui': 'var(--xh-font-ui)',
        'xh-num': 'var(--xh-font-num)',
        'xh-mono': 'var(--xh-font-mono)',
      },
    },
  },
  plugins: [],
  // 生产环境优化
  ...(process.env.NODE_ENV === 'production' &&
    {
      // 移除 safelist，因为这些都是自定义 CSS 类，不是 Tailwind 工具类
      // theme-*, xhunt-*, floating-* 都是在 CSS 文件中定义的自定义类
      // Tailwind 的 purge 功能不会移除这些类，因为它们不是 Tailwind 的工具类
    }),
};
