export class IFrameLoader {
  private baseURI: string;

  private isIE: boolean;

  constructor(baseURI: string) {
    this.baseURI = baseURI;
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

    const contentUri = this.baseURI + src;

    this.fetchContentDocument(contentUri).then((contentData: string) => {
      this.loadIframeWithDocument(iframe, contentData, attachedData, callback);
    });
  }

  public async fetchContentDocument(src: string): Promise<string> {
    const resp = await fetch(src);

    return resp.text();
  }


  private loadIframeWithDocument(
    iframe: HTMLIFrameElement,
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

      documentDataUri = window.URL.createObjectURL(
        new Blob([contentDocumentData], { type: contentType }),
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
