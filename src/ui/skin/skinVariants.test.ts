import { createRequire } from 'node:module';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);
const config = require('../../../tailwind.config.js');

async function compile(classes: string) {
  const result = await postcss([
    tailwindcss({
      ...config,
      content: [{ raw: classes, extension: 'html' }],
      corePlugins: { preflight: false },
    }),
  ]).process('@tailwind utilities;', { from: undefined });
  return result.css;
}

describe('skin variants', () => {
  test('style descendants of a data-skin root and the root itself', async () => {
    const css = await compile('h-9 soft:h-10 obsidian:h-8 native:h-11');
    expect(css).toContain('[data-skin="soft"] .soft\\:h-10');
    expect(css).toContain('[data-skin="obsidian"] .obsidian\\:h-8');
    expect(css).toContain('[data-skin="native"] .native\\:h-11');
    expect(css).toContain('.obsidian\\:h-8[data-skin="obsidian"]');
  });

  test('stack with state variants', async () => {
    const css = await compile('obsidian:data-[checked]:bg-xh-accent');
    expect(css).toContain('[data-skin="obsidian"] .obsidian\\:data-\\[checked\\]\\:bg-xh-accent[data-checked]');
  });
});
