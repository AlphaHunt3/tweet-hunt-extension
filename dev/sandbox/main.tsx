import { seedStorage } from './chromeShim';
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
import { MOCK_USER } from './mocks/fixtures';
import { PanelDemo } from './PanelDemo';
import { ProfileDemo } from './ProfileDemo';
import { configManager } from '~/utils/configManager';
import { useLocalStorage } from '~storage/useLocalStorage';

const HOSTS: Record<XPalette, { bg: string; fg: string; theme: 'light' | 'dark' }> = {
  default: { bg: '#ffffff', fg: '#0f1419', theme: 'light' },
  dim: { bg: '#15202b', fg: '#f7f9f9', theme: 'dark' },
  'lights-out': { bg: '#000000', fg: '#e7e9ea', theme: 'dark' },
};

const SWATCHES = ['canvas', 'raised', 'surface', 'sunken', 'line', 'fg', 'fg-2', 'fg-3', 'accent', 'accent-soft', 'up', 'down', 'warn'];

type View = 'panel' | 'gallery' | 'profile';

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
  const { skin, setSkin } = useUiSkin();
  const [palette, setPalette] = useState<XPalette>('dim');
  const params = new URLSearchParams(location.search);
  const [view, setView] = useState<View>((params.get('view') as View) || 'panel');
  const mount = useShadowMount();
  const host = HOSTS[palette];
  // 扩展里由 useThemeWatcher 跟随 X 的明暗写入，沙盒跟随所选背景
  const [, setXhuntTheme] = useLocalStorage<string>('@xhunt/theme', 'dark');

  useEffect(() => {
    setXhuntTheme(host.theme);
  }, [host.theme, setXhuntTheme]);

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
        {(['panel', 'profile', 'gallery'] as View[]).map((v) => (
          <button key={v} type="button" aria-pressed={v === view} onClick={() => setView(v)}>
            {v === 'panel' ? '面板' : v === 'profile' ? '资料页' : '组件'}
          </button>
        ))}
        {view === 'profile' && (
          <button
            type="button"
            aria-pressed={params.get('kind') === 'project'}
            onClick={() => {
              location.search = params.get('kind') === 'project' ? '?view=profile' : '?view=profile&kind=project';
            }}
          >
            项目资料
          </button>
        )}
        {(['soft', 'obsidian', 'native'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={s === skin} onClick={() => setSkin(s)}>
            风格：{s}
          </button>
        ))}
        {(Object.keys(HOSTS) as XPalette[]).map((p) => (
          <button key={p} type="button" aria-pressed={p === palette} onClick={() => setPalette(p)}>
            X 背景：{p}
          </button>
        ))}
      </div>
      <div id="stage">
        {/* 资料页组件要在主文档里找 X 的节点，不能放进沙盒自己的 Shadow Root */}
        {view === 'profile' && <ProfileDemo palette={palette} />}
        <div id="shadow-host" />
      </div>
      {mount &&
        createPortal(
          view === 'profile' ? null : view === 'panel' ? (
            <div data-theme={host.theme} data-skin={skin}>
              <PanelDemo />
            </div>
          ) : (
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
            </div>
          ),
          mount,
        )}
    </>
  );
}

await seedStorage({
  '@xhunt/user': MOCK_USER,
  '@xhunt/token': 'sandbox',
  '@xhunt/header-controls-guide-dismissed-map': { settings: true, messages: true, drag: true, panel: true },
  '@xhunt/uiSkinIntroSeen': true,
  '@settings/language1': 'zh',
  '@xhunt/user-domain-preference': { domains: ['web3', 'ai'], primaryDomain: 'web3' },
});
// 扩展里由 useSystemInitialization 加载远程配置；沙盒没有那条链路，在这里加载
await configManager.init();
createRoot(document.getElementById('app')!).render(<App />);
