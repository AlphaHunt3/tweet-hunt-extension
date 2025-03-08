import React from 'react'
import cssText from 'data-text:~/css/style.css'
import tipCss from 'data-text:~/css/tippy.css'
import scaleCss from 'data-text:~/css/scale.css'
import useMainData from '~contents/hooks/useMainData.ts';
import { FixedTwitterPanel } from '~contents/area/FixedTwitterPanel.tsx';
import { NameRightData } from '~contents/area/NameRightData.tsx';

export const config = {
  matches: ['https://x.com/*']
}
export const getStyle = () => {
  const style = document.createElement('style')
  style.textContent = cssText + tipCss + scaleCss;
  return style
}
const Main = () => {
  const mainData = useMainData();
  return (
    <>
      {/*悬浮框*/}
      <FixedTwitterPanel {...mainData} />

      {/*推特个人详情页名字右边极简数据*/}
      <NameRightData />
    </>
  )
}

export default Main
