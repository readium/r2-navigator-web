export class IFrameLoader {
  private publicationURI: string;

  private isIE: boolean;

  constructor(publicationURI: string) {
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
    attachedData: any,
  ): void {
    iframe.setAttribute('data-baseUri', iframe.baseURI ? iframe.baseURI : '');
    iframe.setAttribute('data-src', src);

    const contentUri = this.publicationURI + src;

    this.fetchContentDocument(contentUri).then((contentData: string) => {
      this.loadIframeWithDocument(iframe, contentUri, contentData, attachedData, callback);
    });
  }

  public async fetchContentDocument(src: string): Promise<string> {
    const resp = await fetch(src);

    return resp.text();
  }

  private injectBaseHref(sourceText: string, contentType: string, href: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceText, contentType);

    const baseElement = doc.createElement('base');
    baseElement.href = href;

    const headElement = doc.querySelector('head');
    if (!headElement) {
      // No head element.. not a valid (X)HTML document?
      // Then just return the original source
      return sourceText;
    }

    headElement.insertBefore(baseElement, headElement.firstChild);

    if (contentType.includes('xml')) {
      return new XMLSerializer().serializeToString(doc);
    }

    return doc.documentElement.outerHTML;
  }

  private loadIframeWithDocument(
    iframe: HTMLIFrameElement,
    contentDocumentURI: string,
    contentDocumentData: string,
    // tslint:disable-next-line:no-any
    attachedData: any,
    // tslint:disable-next-line:no-any
    callback: any,
  ): void {
    let documentDataUri: string = '';
    if (!this.isIE) {
      let contentType = 'text/html';
      if (attachedData.spineItem.media_type && attachedData.spineItem.media_type.length) {
        contentType = attachedData.spineItem.media_type;
      }
      const basedContentData = this.injectBaseHref(
        contentDocumentData,
        contentType,
        new URL(contentDocumentURI, iframe.baseURI || document.baseURI || location.href).href,
      );
      documentDataUri = window.URL.createObjectURL(
        new Blob([basedContentData], { type: contentType }),
      );
    } else {
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
          iframe.contentWindow.document.write(contentDocumentData);
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
    } else {
      iframe.contentWindow.document.close();
    }
  }
}
