import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import styleCss from 'data-text:~/css/style.css';
import { applySkinToDocument, ensureSkinTokens } from '~/ui/skin/documentSkin';
import { ensureSkinFonts } from '~/ui/skin/fonts';
import { SkinIntroNotice } from '~/ui/skin/SkinIntroNotice';
import { SkinPicker } from '~/ui/skin/SkinPicker';
import { useUiSkin } from '~/ui/skin/useUiSkin';
import type { XPalette } from '~/ui/skin/xPalette';
import { Gallery } from './Gallery';

const HOSTS: Record<XPalette, { bg: string; fg: string; theme: 'light' | 'dark' }> = {
  default: { bg: '#ffffff', fg: '#0f1419', theme: 'light' },
  dim: { bg: '#15202b', fg: '#f7f9f9', theme: 'dark' },
  'lights-out': { bg: '#000000', fg: '#e7e9ea', theme: 'dark' },
};

const SWATCHES = ['canvas', 'raised', 'surface', 'sunken', 'line', 'fg', 'fg-2', 'fg-3', 'accent', 'accent-soft', 'up', 'down', 'warn'];

function useShadowMount() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const host = document.getElementById('shadow-host')!;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = styleCss;
    const div = document.createElement('div');
    shadow.append(style, div);
    setMount(div);
  }, []);
  return mount;
}

function App() {
  const { skin } = useUiSkin();
  const [palette, setPalette] = useState<XPalette>('dim');
  const mount = useShadowMount();
  const host = HOSTS[palette];

  useEffect(() => {
    ensureSkinTokens();
  }, []);

  useEffect(() => {
    document.body.style.setProperty('--host-bg', host.bg);
    document.body.style.setProperty('--host-fg', host.fg);
    applySkinToDocument(document.documentElement, { skin, theme: host.theme, palette });
    ensureSkinFonts(skin);
  }, [skin, palette, host]);

  return (
    <>
      <div className="bar">
        {(Object.keys(HOSTS) as XPalette[]).map((p) => (
          <button key={p} type="button" aria-pressed={p === palette} onClick={() => setPalette(p)}>
            X 背景：{p}
          </button>
        ))}
      </div>
      <div id="stage">
        <div id="shadow-host" />
      </div>
      {mount &&
        createPortal(
          // 外层布局用行内样式：Tailwind 只扫描 src，沙盒自己的类名不会被生成
          <div
            data-theme={host.theme}
            data-skin={skin}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxWidth: 380,
              padding: 12,
              background: 'var(--xh-canvas)',
              borderRadius: 'var(--xh-radius-panel)',
              boxShadow: 'var(--xh-shadow-panel)',
              fontFamily: 'var(--xh-font-ui)',
            }}
          >
            <SkinIntroNotice />
            <div style={{ background: 'var(--xh-raised)', borderRadius: 'var(--xh-radius-card)', padding: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--xh-fg)' }}>界面风格</p>
              <SkinPicker />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {SWATCHES.map((name) => (
                <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--xh-fg-2)' }}>
                  <span style={{ display: 'block', width: '100%', height: 32, borderRadius: 8, border: '1px solid var(--xh-line)', background: `var(--xh-${name})` }} />
                  {name}
                </div>
              ))}
            </div>
            <Gallery />
            <div className="theme-bg-secondary theme-text-primary" style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, fontSize: 12 }}>
              旧组件（theme-*）跟随当前风格
            </div>
          </div>,
          mount,
        )}
    </>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
