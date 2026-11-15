export function reloadPage(delay = 200) {
  setTimeout(() => {
    try {
      window.location.reload();
    } catch {}
  }, delay);
}
