import cssText from 'data-text:~/css/style.css'
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import { HoverStatItem } from '~contents/compontents/HoverStatItem.tsx';

export function NameRightData() {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
    shadowStyle: 'width: 100%'
  })

  // 利用 React Portal 把组件渲染到目标元素内部
  if (!shadowRoot) return null;
  return ReactDOM.createPortal(
    <div className="flex flex-wrap items-center w-full mh-[40px] h-auto mt-4">
      <HoverStatItem label={'投资人'} value={'8'} hoverContent={'33'} valueClassName={'text-[#1D9BF0]'}/>
      <HoverStatItem label={'90d谈及代币'} value={'10'} hoverContent={'33'}/>
      <HoverStatItem label={'90d收益率'} value={'+10%'} hoverContent={'33'} valueClassName="text-green-400"/>
      <HoverStatItem label={'删帖'} value={'2'} hoverContent={'33'} valueClassName="text-red-400"/>
    </div>,
    shadowRoot
  );
}
