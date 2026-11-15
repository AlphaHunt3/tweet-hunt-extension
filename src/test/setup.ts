import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetMemoryStorage } from './memoryStorage';

configure({ testIdAttribute: 'data-xhunt-testid' });

HTMLElement.prototype.showPopover = function () {};
HTMLElement.prototype.hidePopover = function () {};
Element.prototype.getAnimations = () => [];
Element.prototype.scrollIntoView = function () {};
Element.prototype.checkVisibility = () => true;
Element.prototype.getClientRects = () => [] as unknown as DOMRectList;
document.elementFromPoint = () => null;
document.elementsFromPoint = () => [];
(globalThis as any).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
document.head.append(
  Object.assign(document.createElement('style'), {
    textContent: '[popover] { display: block !important }',
  }),
);

afterEach(() => {
  cleanup();
  resetMemoryStorage();
  const html = document.documentElement;
  html.removeAttribute('data-xh-skin');
  html.removeAttribute('data-xh-theme');
  html.removeAttribute('data-xh-palette');
  document.head.querySelectorAll('style[id^="xh-"]').forEach((el) => el.remove());
});
