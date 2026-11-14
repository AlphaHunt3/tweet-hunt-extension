import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/css/skin-tokens.css'), 'utf8');

const BLOCKS = [
  "html[data-xh-skin='soft'][data-xh-theme='light']",
  "html[data-xh-skin='soft'][data-xh-theme='dark']",
  "html[data-xh-skin='obsidian'][data-xh-theme='dark']",
  "html[data-xh-skin='obsidian'][data-xh-theme='light']",
  "html[data-xh-skin='native'][data-xh-palette='default']",
  "html[data-xh-skin='native'][data-xh-palette='dim']",
  "html[data-xh-skin='native'][data-xh-palette='lights-out']",
];

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} is missing`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('}', start));
}

describe('skin tokens', () => {
  test.each(BLOCKS)('%s defines hover, strong line and card shadow', (selector) => {
    const body = block(selector);
    for (const token of ['--xh-hover:', '--xh-line-2:', '--xh-shadow-card:']) {
      expect(body).toContain(token);
    }
  });

  test('obsidian defines a rail background for both themes', () => {
    expect(block("html[data-xh-skin='obsidian'][data-xh-theme='dark']")).toContain('--xh-rail:');
    expect(block("html[data-xh-skin='obsidian'][data-xh-theme='light']")).toContain('--xh-rail:');
  });
});
