import { URL } from 'isomorphic-url-shim';
import { Resource, applyResourcesToDocument } from '../utils/injection-resolver';
import { IContentLoader, ILoaderConfig, ContentType } from './content-loader';

interface IR1AttachedDataType {
  // tslint:disable-next-line:no-any
  spineItem: any;
}

interface IIframeLoaderConfig extends ILoaderConfig {
  useReadiumCss?: boolean;
  useReadiumCssOverride?: boolean;
}

export class IFrameLoader implements IContentLoader {
  private publicationURI?: string;

  private isIE: boolean;
  private useSrcdoc: boolean = false;
 
  private readiumCssBasePath?: string;
  private loaderEvents: { [eventName: string]: Function[] } = {};
  private injectableResources: Resource[] = [];
  private readiumCssResources: Resource[];

  private loaderConfig: IIframeLoaderConfig;

  constructor(publicationURI?: string) {
    this.publicationURI = publicationURI;
    this.isIE =
      window.navigator.userAgent.indexOf('Trident') > 0 ||
      window.navigator.userAgent.indexOf('Edge') > 0;
  }

  public setReadiumCssBasePath(path: string): void {
    this.readiumCssBasePath = path;
  }

  public enableUseSrcdoc(): void {
    this.useSrcdoc = true;
  }

  public addContentLoadedListener(listener: Function): void {
    const eventName = 'iframeLoaded';
    this.addListener(eventName, listener);
  }

  public addContentUnloadedListener(listener: Function): void {
    const eventName = 'iframeUnloaded';
    this.addListener(eventName, listener);
  }

  public contentType(): ContentType {
    return ContentType.Html;
  }

  public setConfig(config: IIframeLoaderConfig): void {
    this.loaderConfig = config;
  }

  public loadContent(
    iframe: HTMLIFrameElement,
    src: string,
    // tslint:disable-next-line:no-any
    callback: any,
    attachedData: string | IR1AttachedDataType,
  ): void {
    const baseURI = this.publicationURI || iframe.baseURI || document.baseURI || location.href;
    iframe.setAttribute('data-baseUri', baseURI);
    iframe.setAttribute('data-src', src);

    const contentUri = new URL(src, baseURI).toString();

    let contentType = 'text/html';
    // tslint:disable-next-line:no-any
    if ((<any>attachedData).spineItem !== undefined) {
      const data = <IR1AttachedDataType>attachedData;
      if (data.spineItem.media_type && data.spineItem.media_type.length) {
        contentType = data.spineItem.media_type;
      }
    } else {
      contentType = <string>attachedData;
    }

    this.fetchContentDocument(contentUri).then((contentData: string) => {
      this.loadIframeWithDocument(iframe, contentUri, contentData, contentType, callback);
    });
  }

  private addListener(eventName: string, callback: Function): void {
    const events = this.loaderEvents[eventName] || [];
    events.push(callback);

    this.loaderEvents[eventName] = events;
  }

  private async fetchContentDocument(src: string): Promise<string> {
    const resp = await fetch(src);

    return resp.text();
  }

  public registerInjectableResources(resources: Resource[]): void {
    this.injectableResources = resources;
  }

  private inject(
    sourceText: string,
    contentType: string,
    href: string,
    config: IIframeLoaderConfig,
  ): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceText, <SupportedType>contentType);

    const headElement = doc.querySelector('head');
    if (!doc.documentElement || !headElement) {
      // No head element.. not a valid (X)HTML document?
      // Then just return the original source
      return sourceText;
    }

    this.injectBaseHref(doc, headElement, href);
    let allResources = this.injectableResources;
    if (config.useReadiumCss === true) {
      this.injectReadiumCss(config.useReadiumCssOverride === true);
      allResources = this.injectableResources.concat(this.readiumCssResources);
    }

    applyResourcesToDocument(allResources, doc);

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

  private injectReadiumCss(useOverride: boolean): void {
    this.readiumCssResources = [];

    if (!this.readiumCssBasePath) {
      return;
    }

    this.readiumCssResources.push({
      href: `${this.readiumCssBasePath}/ReadiumCSS-before.css`,
      type: 'text/css',
      target: 'head',
      insertion: 'append',
    });

    this.readiumCssResources.push({
      href: `${this.readiumCssBasePath}/ReadiumCSS-default.css`,
      type: 'text/css',
      target: 'head',
      insertion: 'append',
    });

    this.readiumCssResources.push({
      href: `${this.readiumCssBasePath}/ReadiumCSS-after.css`,
      type: 'text/css',
      target: 'head',
      insertion: 'append',
    });

    if (useOverride) {
      this.readiumCssResources.push({
        href: `${this.readiumCssBasePath}/ReadiumCSS-override.css`,
        type: 'text/css',
        target: 'head',
        insertion: 'append',
      });
  }
  }

  private iframeLoaded(iframe: HTMLIFrameElement): void {
    const eventCbs = this.loaderEvents.iframeLoaded;
    if (!eventCbs) return;

    eventCbs.forEach(eventCb => eventCb(iframe));
  }

  private iframeUnloaded(iframe: HTMLIFrameElement): void {
    const eventCbs = this.loaderEvents.iframeUnloaded;
    if (!eventCbs) return;

    eventCbs.forEach(eventCb => eventCb(iframe));
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
    const basedContentData = this.inject(
      contentDocumentData,
      contentType,
      new URL(contentDocumentURI, iframe.baseURI || document.baseURI || location.href).href,
      this.loaderConfig,
    );

    if (this.useSrcdoc) {
      iframe.setAttribute('srcdoc', basedContentData);
    } else if (!this.isIE) {
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
            iframe.contentWindow.document.write(basedContentData);
          }
        });
      } else {
        iframe.contentWindow.document.write(basedContentData);
      }
    }

    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) {
      console.error('Could not find iframe content window - unable to add load / unload listeners');
      return;
    }

    iframe.addEventListener('load', () => {
      this.iframeLoaded(iframe);
      callback(true);
      if (!this.isIE) {
        window.URL.revokeObjectURL(documentDataUri);
      }
    });

    iframeWindow.addEventListener('unload', () => {
      this.iframeUnloaded(iframe);
    });

    if (this.useSrcdoc) {
      // intentionally blank
    } else if (!this.isIE) {
      iframe.setAttribute('src', documentDataUri);
    } else if (iframe.contentWindow) {
      iframe.contentWindow.document.close();
    }
  }
}
