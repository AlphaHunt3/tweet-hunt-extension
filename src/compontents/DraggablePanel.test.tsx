import { render } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DraggablePanel } from './DraggablePanel';

vi.mock('~storage/useLocalStorage.ts', () => import('../test/memoryStorage'));
vi.mock('~contents/hooks/useGlobalResize', () => ({ useGlobalResize: () => {} }));

const panelLeft = (container: HTMLElement) => {
  const node = container.querySelector('.fixed') as HTMLElement;
  return Number(node.style.transform.match(/translate\((-?[\d.]+)px/)?.[1]);
};

describe('DraggablePanel', () => {
  test('pulls the panel back on screen when it gets wider', () => {
    const { container, rerender } = render(
      <DraggablePanel width={340} storageKey='test-panel'>
        <p>panel</p>
      </DraggablePanel>,
    );
    expect(panelLeft(container)).toBe(window.innerWidth - 340 - 30);

    rerender(
      <DraggablePanel width={388} storageKey='test-panel'>
        <p>panel</p>
      </DraggablePanel>,
    );
    expect(panelLeft(container) + 388).toBeLessThanOrEqual(window.innerWidth - 30);
  });

  test('keeps its place when it gets narrower', () => {
    const { container, rerender } = render(
      <DraggablePanel width={340} storageKey='test-panel'>
        <p>panel</p>
      </DraggablePanel>,
    );
    const before = panelLeft(container);
    rerender(
      <DraggablePanel width={48} storageKey='test-panel'>
        <p>panel</p>
      </DraggablePanel>,
    );
    expect(panelLeft(container)).toBe(before);
  });
});
