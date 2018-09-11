import { URL } from 'isomorphic-url-shim';

interface IR1AttachedDataType {
  // tslint:disable-next-line:no-any
  spineItem: any;
}

export class IFrameLoader {
  private publicationURI?: string;

  private isIE: boolean;

  constructor(publicationURI?: string) {
    this.publicationURI = publicationURI;
    this.isIE =
      window.navigator.userAgent.indexOf('Trident') > 0 ||
      window.navigator.userAgent.indexOf('Edge') > 0;
  }

  public loadIframe(
    iframe: HTMLIFrameElement,
    src: string,
    // tslint:disable-next-line:no-any
    callback: any,
    // tslint:disable-next-line:no-any
    context: any,
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
      this.loadIframeWithDocument(iframe, contentUri, contentData, contentType, callback);
    });
  }

  private async fetchContentDocument(src: string): Promise<string> {
    const resp = await fetch(src);

    return resp.text();
  }

  private inject(sourceText: string, contentType: string, href: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceText, contentType);

    const headElement = doc.querySelector('head');
    if (!headElement) {
      // No head element.. not a valid (X)HTML document?
      // Then just return the original source
      return sourceText;
    }

    this.injectBaseHref(doc, headElement, href);
    // this.injectReadiumCss(doc, headElement);

    if (contentType.includes('xml')) {
      return new XMLSerializer().serializeToString(doc);
    }

    return doc.documentElement.outerHTML;
  }

  private injectBaseHref(doc: Document, headEle: HTMLHeadElement, href: string): void {
    const baseElement = doc.createElement('base');
    baseElement.href = href;

    headEle.insertBefore(baseElement, headEle.firstChild);
  }

  private injectReadiumCss(doc: Document, headEle: HTMLHeadElement): void {
    const beforeCss = this.creatCssLink('/assets/readium-css/ReadiumCSS-before.css');
    const defaultCss = this.creatCssLink('/assets/readium-css/ReadiumCSS-default.css');
    const afterCss = this.creatCssLink('/assets/readium-css/ReadiumCSS-after.css');

    headEle.appendChild(beforeCss);
    headEle.appendChild(defaultCss);
    headEle.appendChild(afterCss);
  }

  private creatCssLink(href: string): HTMLLinkElement {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.type = 'text/css';
    cssLink.href = href;

    return cssLink;
  }

  private loadIframeWithDocument(
    iframe: HTMLIFrameElement,
    contentDocumentURI: string,
    contentDocumentData: string,
    contentType: string,
    // tslint:disable-next-line:no-any
    callback: any,
  ): void {
    let documentDataUri: string = '';
    if (!this.isIE) {
      const basedContentData = this.inject(
        contentDocumentData,
        contentType,
        new URL(contentDocumentURI, iframe.baseURI || document.baseURI || location.href).href,
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
