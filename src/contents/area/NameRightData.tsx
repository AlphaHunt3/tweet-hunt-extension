import cssText from 'data-text:~/css/style.css'
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';

export function NameRightData() {
  const shadowRoot = useShadowContainer({
    selector: 'div[data-testid="UserName"]',
    styleText: cssText,
    shadowStyle: 'width: 100%'
  })

  // 利用 React Portal 把组件渲染到目标元素内部
  if (!shadowRoot) return null;
  return ReactDOM.createPortal(
    <div className="w-full h-[40px] bg-[#15202b]/70">
      嵌入式组件内容
    </div>,
    shadowRoot
  );
}
