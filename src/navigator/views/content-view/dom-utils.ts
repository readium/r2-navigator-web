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

export function triggerLayout(iframe: HTMLIFrameElement): void {
  const doc = iframe.contentDocument;
  if (!doc || !doc.head) {
    return;
  }

  let ss: CSSStyleSheet | null = null;
  try {
    ss = doc.styleSheets && doc.styleSheets.length ? <CSSStyleSheet>doc.styleSheets[0] : null;
    if (!ss && doc.head) {
      const style = doc.createElement('style');
      doc.head.appendChild(style);
      style.appendChild(doc.createTextNode(''));
      ss = <CSSStyleSheet>style.sheet;
    }

    if (ss) {
      const cssRule = "body:first-child::before {content:'READIUM';color: red;font-weight: bold;}";
      if (ss && ss.cssRules) {
        ss.insertRule(cssRule, ss.cssRules.length);
      } else {
        ss.insertRule(cssRule, 0);
      }
    }
  } catch (ex) {
    console.error(ex);
  }

  try {
    // tslint:disable-next-line:no-http-string
    const el = doc.createElementNS('http://www.w3.org/1999/xhtml', 'style');
    el.appendChild(doc.createTextNode('*{}'));
    doc.body.appendChild(el);
    doc.body.removeChild(el);

    if (ss) {
      if (ss.cssRules) {
        ss.deleteRule(ss.cssRules.length - 1);
      } else {
        ss.deleteRule(0);
      }
    }
  } catch (ex) {
    console.error(ex);
  }

  if (doc.body) {
    const val = doc.body.offsetTop; // triggers layout
  }
}

export function getAllPrecedingElements(root: Element, element: Element | null): Element[] {
  const iterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node: Node): number {
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const elements = [];
  let next: Element | null = iterator.nextNode() as Element;

  while (next) {
    elements.push(next);

    if (next === element) {
      break;
    }

    next = iterator.nextNode() as Element;
  }

  return elements;
}

export function getAllAncestors(element: Element | null): Element[] {
  if (!element) {
    return [];
  }

  return [...getAllAncestors(element.parentElement), element];
}

export function getIdsFromElements(elements: Element[]): string[] {
  return elements
    .filter((element) => element.hasAttribute('id'))
    .map((element) => element.getAttribute('id')!);
}
