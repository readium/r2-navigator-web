export interface Resource {
  href: string;
  type: 'text/javascript' | 'text/css';
  target: string;
  insertion: 'append' | 'prepend';
  preload?: boolean;
}

export function applyResourcesToDocument(resources: Resource[], document: Document): void {
  if (!resources) {
    return;
  }

  resources.forEach((resource) => {
    applyResource(resource, document);
  });
}

function createCssLinkElement(href: string, document: Document): HTMLLinkElement {
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.type = 'text/css';
  cssLink.href = href;

  return cssLink;
}

function createScriptElement(src: string, document: Document): HTMLScriptElement {
  const scriptElement = document.createElement('script');
  scriptElement.type = 'text/javascript';
  scriptElement.src = src;
  scriptElement.async = false;
  return scriptElement;
}

export function applyResource(resource: Resource, document: Document): boolean {
  const { href, type, target, insertion } = resource;

  let element;
  if (type === 'text/javascript') {
    element = createScriptElement(href, document);
  } else if (type === 'text/css') {
    element = createCssLinkElement(href, document);
  } else {
    return false;
  }

  let targetElement;
  if (target === 'head') {
    targetElement = document.head;
  } else {
    targetElement = document.querySelector(target);
  }

  if (!targetElement) {
    return false;
  }

  if (insertion === 'prepend') {
    targetElement.prepend(element);
  } else if (insertion === 'append') {
    targetElement.append(element);
  } else {
    return false;
  }

  return true;
}
