// 通用 HTML 清洗函数：去除脚本/事件/危险标签，规范链接与视频属性
export function sanitizeHtml(html: string | undefined): string {
  if (!html) return '';
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 移除所有 script 标签
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach((script) => script.remove());

    // 移除所有内联事件与 javascript: 危险 href
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (
          attr.name.startsWith('on') ||
          (attr.name === 'href' &&
            attr.value.trim().toLowerCase().startsWith('javascript:'))
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // 移除 iframe、object、embed
    tempDiv.querySelectorAll('iframe').forEach((n) => n.remove());
    tempDiv.querySelectorAll('object, embed').forEach((n) => n.remove());

    // 处理链接
    tempDiv.querySelectorAll('a').forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    // 处理视频，禁止自动播放并加 controls
    tempDiv.querySelectorAll('video').forEach((video) => {
      video.removeAttribute('autoplay');
      video.setAttribute('controls', '');
      video.setAttribute('preload', 'none');
      video.setAttribute('playsinline', '');
      video.setAttribute('onerror', 'this.style.display="none"');
    });

    return tempDiv.innerHTML;
  } catch (error) {
    console.log('Error sanitizing HTML:', error);
    return '';
  }
}
