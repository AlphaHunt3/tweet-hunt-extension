import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { BellIcon, GripIcon, StarIcon } from './icons';
import { cx } from './primitives/cx';

describe('icons', () => {
  test('render decorative 24px-grid svgs at the requested size', () => {
    const { container } = render(<BellIcon size={18} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
  });

  test('filled icons use currentColor fill', () => {
    const { container } = render(
      <>
        <StarIcon />
        <GripIcon />
      </>,
    );
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('fill')).toBe('currentColor');
      expect(svg.getAttribute('stroke')).toBe('none');
    }
    expect(container.querySelectorAll('svg')[1].querySelectorAll('circle')).toHaveLength(6);
  });
});

describe('cx', () => {
  test('joins truthy class names', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
});
