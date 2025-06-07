import { useEffect, useState } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage.ts';

// 定义提示类型
type TipType = 'suc' | 'fail' | 'warning' | 'default';

interface TipData {
  text: string;
  type?: TipType;
}

export const useGlobalTips = () => {
  return useLocalStorage<TipData | string>('@xhunt/tips', {
    text: '',
    type: 'suc'
  });
}

export function GlobalTips() {
  const [tips, setTips] = useGlobalTips();

  const [visible, setVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState<TipData | null>(null);

  // 颜色方案配置（支持 dark 模式）
  const getColors = (type: TipType) => {
    switch (type) {
      case 'suc':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fail':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  // tips 变化时触发提示
  useEffect(() => {
    if (!tips) return;
    let newTips = tips
    if (typeof tips === 'string') {
      newTips = {
        text: tips,
        type: 'default'
      }
    }
    setCurrentTip(newTips as TipData);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      setTips({
        text: '',
        type: 'suc'
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [tips]);

  if (!visible || !currentTip?.text) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[99999] pointer-events-none">
      <div
        className={`px-4 py-2 rounded shadow-lg transition-opacity text-sm duration-300 ease-in-out opacity-90 max-w-[500px] break-words whitespace-normal ${getColors(
          currentTip.type || 'suc'
        )}`}
      >
        <p
          dangerouslySetInnerHTML={{ __html: currentTip.text }}
        />
      </div>
    </div>
  );
}
