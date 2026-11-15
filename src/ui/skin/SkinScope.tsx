import type { HTMLAttributes } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { cx } from '../primitives/cx';
import { useUiSkin } from './useUiSkin';

// X 页面里的挂载点各自是一个 Shadow Root，看不到主文档上的风格属性，每个根都要包一层
export function SkinScope({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const { skin } = useUiSkin();
  const [theme] = useLocalStorage<string>('@xhunt/theme', 'dark');
  return (
    <div
      {...rest}
      data-skin={skin}
      data-theme={theme === 'light' ? 'light' : 'dark'}
      className={cx('contents', className)}
    >
      {children}
    </div>
  );
}
