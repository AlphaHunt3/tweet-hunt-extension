module.exports = {
  plugins: [
    require('tailwindcss'),
    {
      postcssPlugin: 'xhunt-namespace-tw-vars',
      Declaration(decl) {
        if (
          decl.prop.startsWith('--tw-') &&
          !decl.prop.startsWith('--tw-prose-')
        ) {
          decl.prop = decl.prop.replace(/^--tw-/, '--xhunt-tw-');
        }
        if (decl.value && decl.value.includes('--tw-')) {
          decl.value = decl.value.replace(/--tw-(?!prose-)/g, '--xhunt-tw-');
        }
      },
    },
    require('autoprefixer'),
  ],
};
