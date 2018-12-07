import { URL } from 'isomorphic-url-shim';
// @ts-ignore
// tslint:disable-next-line:no-submodule-imports
import ReadiumGluePayloadJs from 'r2-glue-js/dist/ReadiumGlue-payload.js';

interface IR1AttachedDataType {
  // tslint:disable-next-line:no-any
  spineItem: any;
}

interface ILoaderConfig {
  useReadiumCss?: boolean;
  useReadiumCssOverride?: boolean;
}

export class IFrameLoader {
  private publicationURI?: string;

  private isIE: boolean;

  private readiumCssBasePath?: string;
  private loaderEvents: { [eventName: string]: Function[] } = {};

  constructor(publicationURI?: string) {
    this.publicationURI = publicationURI;
    this.isIE =
      window.navigator.userAgent.indexOf('Trident') > 0 ||
      window.navigator.userAgent.indexOf('Edge') > 0;
  }

  public setReadiumCssBasePath(path: string): void {
    this.readiumCssBasePath = path;
  }

  public addIFrameLoadedListener(callback: Function): void {
    const eventName = 'iframeLoaded';
    const events = this.loaderEvents[eventName] || [];
    events.push(callback);

    this.loaderEvents[eventName] = events;
  }

  public loadIframe(
    iframe: HTMLIFrameElement,
    src: string,
    // tslint:disable-next-line:no-any
    callback: any,
    config: ILoaderConfig,
    // tslint:disable-next-line:no-any
    attachedData: string | IR1AttachedDataType,
  ): void {
    const baseURI = this.publicationURI || iframe.baseURI || document.baseURI || location.href;
    iframe.setAttribute('data-baseUri', baseURI);
    iframe.setAttribute('data-src', src);

    const contentUri = new URL(src, baseURI).toString();

    let contentType = 'text/html';
    // tslint:disable-next-line:no-any
    if ((<any>(attachedData)).spineItem !== undefined) {
      const data = <IR1AttachedDataType>(attachedData);
      if (data.spineItem.media_type && data.spineItem.media_type.length) {
        contentType = data.spineItem.media_type;
      }
    } else {
      contentType = <string>(attachedData);
    }

    this.fetchContentDocument(contentUri).then((contentData: string) => {
      this.loadIframeWithDocument(iframe, contentUri, contentData, contentType, config, callback);
    });
  }

  private async fetchContentDocument(src: string): Promise<string> {
    const resp = await fetch(src);

    return resp.text();
  }

  private inject(sourceText: string,
                 contentType: string,
                 href: string,
                 config: ILoaderConfig): string {
    const parser = new DOMParser();
    // @ts-ignore
    const doc = parser.parseFromString(sourceText, <SupportedType>(contentType));

    const headElement = doc.querySelector('head');
    if (!doc.documentElement || !headElement) {
      // No head element.. not a valid (X)HTML document?
      // Then just return the original source
      return sourceText;
    }

    this.injectBaseHref(doc, headElement, href);
    if (config.useReadiumCss === true) {
      const useOverride = config.useReadiumCssOverride === true;
      this.injectReadiumCss(headElement, useOverride);
    }

    this.injectReadiumGlue(doc, headElement);

    if (contentType.includes('xml')) {
      return new XMLSerializer().serializeToString(doc);
    }

    if (!doc.documentElement) {
      return '';
    }

    return doc.documentElement.outerHTML;
  }

  private injectBaseHref(doc: Document, headEle: HTMLHeadElement, href: string): void {
    const baseElement = doc.createElement('base');
    baseElement.href = href;

    headEle.insertBefore(baseElement, headEle.firstChild);
  }

  private injectReadiumCss(headEle: HTMLHeadElement, useOverride: boolean): void {
    if (!this.readiumCssBasePath) {
      return;
    }
    const beforeCss = this.creatCssLink(`${this.readiumCssBasePath}/ReadiumCSS-before.css`);
    const defaultCss = this.creatCssLink(`${this.readiumCssBasePath}/ReadiumCSS-default.css`);
    const afterCss = this.creatCssLink(`${this.readiumCssBasePath}/ReadiumCSS-after.css`);

    // Need to insert before any node except <base>
    let refNode: Node | null = null;
    if (headEle.firstChild) {
      // firstChild should be <base>
      refNode = headEle.firstChild.nextSibling;
    }

    headEle.insertBefore(beforeCss, refNode);
    headEle.insertBefore(defaultCss, refNode);
    headEle.insertBefore(afterCss, refNode);

    if (useOverride) {
      const overrideCss = this.creatCssLink(`${this.readiumCssBasePath}/ReadiumCSS-override.css`);
      headEle.insertBefore(overrideCss, refNode);
    }
  }

  private injectReadiumGlue(doc: Document, headEle: HTMLHeadElement): void {
    // This lives within the iframe
    const payload = this.createJSElement(ReadiumGluePayloadJs);

    headEle.appendChild(payload);
  }

  private creatCssLink(href: string): HTMLLinkElement {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = href;

    return cssLink;
  }

  private createJSElement(href: string): HTMLScriptElement {
    const el = document.createElement('script');
    el.setAttribute('type', 'text/javascript');

    const blob = new Blob([href], { type : 'application/javascript' });
    const url = window.URL.createObjectURL(blob);
    el.setAttribute('src', url);

    return el;
  }

  private iframeLoaded(iframe: HTMLIFrameElement): void {
    const eventCbs = this.loaderEvents.iframeLoaded;
    if (!eventCbs) return;

    eventCbs.forEach(eventCb => eventCb(iframe));
  }

  private loadIframeWithDocument(
    iframe: HTMLIFrameElement,
    contentDocumentURI: string,
    contentDocumentData: string,
    contentType: string,
    config: ILoaderConfig,
    // tslint:disable-next-line:no-any
    callback: any,
  ): void {
    let documentDataUri: string = '';
    if (!this.isIE) {
      const basedContentData = this.inject(
        contentDocumentData,
        contentType,
        new URL(contentDocumentURI, iframe.baseURI || document.baseURI || location.href).href,
        config,
      );
      documentDataUri = window.URL.createObjectURL(
        new Blob([basedContentData], { type: contentType }),
      );
    } else if (iframe.contentWindow) {
      // Internet Explorer doesn't handle loading documents from Blobs correctly.
      // Currently using the document.write() approach only for IE, as it breaks CSS selectors
      // with namespaces for some reason (e.g. the childrens-media-query sample EPUB)
      iframe.contentWindow.document.open();

      // tslint:disable-next-line:no-any
      const MSApp = (<any>window).MSApp;

      // Currently not handled automatically by winstore-jscompat,
      // so we're doing it manually. See:
      // https://github.com/MSOpenTech/winstore-jscompat/

      if (MSApp && MSApp.execUnsafeLocalFunction) {
        // tslint:disable-next-line:no-disable-auto-sanitization
        MSApp.execUnsafeLocalFunction(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.document.write(contentDocumentData);
          }
        });
      } else {
        iframe.contentWindow.document.write(contentDocumentData);
      }
    }

    iframe.onload = () => {
      this.iframeLoaded(iframe);
      callback(true);
      if (!this.isIE) {
        window.URL.revokeObjectURL(documentDataUri);
      }
    };

    if (!this.isIE) {
      iframe.setAttribute('src', documentDataUri);
    } else if (iframe.contentWindow) {
      iframe.contentWindow.document.close();
    }
  }
}
