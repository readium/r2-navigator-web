export function height(ele: HTMLElement | SVGElement, win?: Window): number {
  const winInUse = win ? win : window;
  const valStr = winInUse.getComputedStyle(ele).getPropertyValue('height');

  return parseFloat(valStr);
}

export function setHeight(ele: HTMLElement, val: number): void {
  ele.style.height = `${val}px`;
}

export function isIframeAlive(iframe: HTMLIFrameElement): boolean {
  let w;
  let d;
  try {
    w = iframe.contentWindow;
    d = iframe.contentDocument;
  } catch (ex) {
    console.error(ex);

    return false;
  }

  return w !== undefined && d !== undefined;
}
