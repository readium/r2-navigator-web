import { PublicationLink } from '@evidentpoint/r2-shared-js';
import { IFrameLoader } from '../../iframe-loader';
import { CancellationToken } from '../types';
import { IContentView } from './content-view';

import * as DomUtils from '../../../utils/dom-utils';

type Size = [number, number];

type IframeLoadedCallback = (success: boolean) => void;

export class R2SinglePageContentView implements IContentView  {
  private host: HTMLElement;

  private iframeContainer: HTMLElement;
  private iframeScaler: HTMLElement;
  private iframe: HTMLIFrameElement;

  private ePubHtml: HTMLHtmlElement | SVGElement | null = null;
  private ePubBody: HTMLBodyElement| null = null;

  private iframeLoader: IFrameLoader;

  private iframeLoadedCallbacks: IframeLoadedCallback[] = [];

  private spineItem: PublicationLink;
  private spineItemIndex: number;

  private metaSize: Size = [0, 0];

  public constructor(loader: IFrameLoader) {
    this.iframeLoader = loader;
  }

  public element(): HTMLElement {
    return this.iframeContainer;
  }

  public metaWidth(): number {
    return this.metaSize[0];
  }

  public metaHeight(): number {
    return this.metaSize[1];
  }

  public calculatedHeight(): number {
    return DomUtils.height(this.iframeContainer);
  }

  public render(): void {
    this.iframeContainer = document.createElement('div');
    this.iframeScaler = document.createElement('div');
    this.iframe = document.createElement('iframe');

    this.iframeContainer.appendChild(this.iframeScaler);
    this.iframeScaler.appendChild(this.iframe);

    this.host.appendChild(this.iframeContainer);

    this.iframeContainer.style.transform = 'none';
    this.iframe.width = '100%';
    this.iframe.height = '100%';
  }

  public async loadSpineItem(spineItem: PublicationLink, spineItemIndex: number,
                             token?: CancellationToken): Promise<void> {
    this.spineItem = spineItem;
    this.spineItemIndex = spineItemIndex;

    this.render();

    this.hideIframe();

    const onIframeContentLoaded = (success: boolean) => {
      this.onIframeLoaded(success);
    };

    this.iframeLoader.loadIframe(this.iframe, spineItem.Href, onIframeContentLoaded,
                                 {}, spineItem.TypeLink);

    return this.iframeLoadedPromise();
  }

  public getPageIndexOffsetFromCfi(cfi: string): number {
    throw new Error('Method not implemented.');
  }

  public getPageIndexOffsetFromElementId(elementId: string): number {
    throw new Error('Method not implemented.');
  }

  public getCfi(offsetMain: number, offset2nd: number): string {
    throw new Error('Method not implemented.');
  }

  public async spineItemLoadedPromise(token?: CancellationToken | undefined): Promise<void> {
    return this.iframeLoadedPromise();
  }

  public unloadSpineItem(): void {
    this.host.removeChild(this.iframeContainer);
  }

  public attachToHost(host: HTMLElement): void {
    this.host = host;
  }

  public setViewSettings(viewSetting: object): void {
    throw new Error('Method not implemented.');
  }

  public scale(scale: number): void {
    this.transform(scale, 0, 0);
  }

  public spineItemPageCount(): number {
    return 1;
  }

  public onResize(): void {
    throw new Error('Method not implemented.');
  }

  private onIframeLoaded(success: boolean): void {
    const epubContentDocument = this.iframe.contentDocument;
    if (epubContentDocument) {
      this.ePubHtml = epubContentDocument.querySelector('html');
      if (!this.ePubHtml) {
        this.ePubHtml = epubContentDocument.querySelector('svg');
      } else {
        this.ePubBody = this.ePubHtml.querySelector('body');
      }
    }

    this.updateMetaSize();

    const contHeight = this.contentDocHeight();
    this.setHeight(contHeight);

    for (const callback of this.iframeLoadedCallbacks) {
      callback(success);
    }
    this.iframeLoadedCallbacks = [];
  }

  private iframeLoadedPromise(token?: CancellationToken): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const listener = (success: boolean) => {
        resolve();
      };

      this.iframeLoadedCallbacks.push(listener);
    });
  }

  private contentDocHeight(): number {
    const win = this.iframe.contentWindow;
    const doc = this.iframe.contentDocument;

    if (win && doc) {
      return Math.round(DomUtils.height(doc.documentElement, win));
    }
    if (this.ePubHtml) {
      console.error('getContentDocHeight ??');

      return DomUtils.height(this.ePubHtml);
    }

    return 0;
  }

  private setHeight(h: number): void {
    DomUtils.setHeight(this.iframeScaler, h);
    DomUtils.setHeight(this.iframeContainer, h);
  }

  private updateMetaSize(): void {
    const contentDocument = this.iframe.contentDocument;
    if (!contentDocument) {
      return;
    }

    let content;
    const viewport = contentDocument.querySelector('meta[name=viewport]');
    if (viewport) {
      content = viewport.getAttribute('content');
    }

    if (!content) {
      const viewbox = contentDocument.querySelector('meta[name=viewbox]');
      if (viewbox) {
        content = viewbox.getAttribute('content');
      }
    }

    let size: Size | undefined;
    if (content) {
      size = this.parseMetaSize(content);
    }

    if (!size) {
      size = this.parseSvgSize(contentDocument);
    }

    if (size !== undefined) {
      this.metaSize = size;
    }
  }

  private parseMetaSize(content: string): Size | undefined {
    const pairs = content.replace(/\s/g, '').split(',');
    const dict = new Map<string, string>();

    let width = Number.NaN;
    let height = Number.NaN;

    for (const pair of pairs) {
      const nameVal = pair.split('=');
      if (nameVal.length === 2) {
        if (nameVal[0] === 'width') {
          width = parseInt(nameVal[1], 10);
        }
        if (nameVal[0] === 'height') {
          height = parseInt(nameVal[1], 10);
        }
      }
    }

    if (!isNaN(width) && !isNaN(height)) {
      return [width, height];
    }

    return undefined;
  }

  private parseSvgSize(contentDoc: Document): Size | undefined {
    const docElement = contentDoc.documentElement;
    if (!docElement || !docElement.nodeName || docElement.nodeName.toLowerCase() !== 'svg') {
      return undefined;
    }

    let width: number|undefined;
    const wAttr = docElement.getAttribute('width');
    const isWidthPercent = wAttr && wAttr.length >= 1 && wAttr[wAttr.length - 1] === '%';
    if (wAttr) {
      try {
        width = parseInt(wAttr, 10);
      } catch (err) {
        width = undefined;
      }
    }

    let widthPercent: number;
    if (width && isWidthPercent) {
      widthPercent = width;
      width = undefined;
    }

    let height: number|undefined;
    const hAttr = docElement.getAttribute('height');
    const isHeightPercent = hAttr && hAttr.length >= 1 && hAttr[hAttr.length - 1] === '%';
    if (hAttr) {
      try {
        height = parseInt(hAttr, 10);
      } catch (err) {
        height = undefined;
      }
    }

    let heightPercent: number;
    if (height && isHeightPercent) {
      heightPercent = height;
      height = undefined;
    }

    if (width && height) {
      return [width, height];
    }

    return undefined;
  }

  private hideIframe(): void {
    this.iframe.style.visibility = 'hidden';
  }

  private showIFrame(): void {
    this.iframe.style.visibility = 'visible';
    this.iframe.style.left = '0px';
    this.iframe.style.top = '0px';
  }

  private transform(scale: number, left: number, top: number): void {
    const elWidth = Math.ceil(this.metaSize[0] * scale);
    const elHeight = Math.floor(this.metaSize[1] * scale);

    this.iframeContainer.style.left = `${left}px`;
    this.iframeContainer.style.top = `${top}px`;
    this.iframeContainer.style.width = `${elWidth}px`;
    this.iframeContainer.style.height = `${elHeight}px`;

    const enable3D = false;
    const needsFixedLayoutScalerWorkAround = false;
    let scalerWidth = this.metaWidth();
    let scalerHeight = this.metaHeight();
    let scalerScale = scale;
    if (this.ePubBody // not SVG spine item (otherwise fails in Safari OSX)
        && needsFixedLayoutScalerWorkAround) {

        // See https://github.com/readium/readium-shared-js/issues/285
      if (this.ePubHtml) {
        this.ePubHtml.style.transform = enable3D ? `scale3D(${scale}, ${scale}, 0)` :
                                                   `scale(${scale})`;
        this.ePubHtml.style.minWidth = `${this.metaWidth()}px`;
        this.ePubHtml.style.minHeight = `${this.metaHeight()}px`;
      }

      if (this.ePubBody) {
        this.ePubBody.style.width = `${this.metaWidth()}px`;
        this.ePubBody.style.height = `${this.metaHeight()}px`;
      }

      scalerWidth *= scale;
      scalerHeight *= scale;
      scalerScale = 1;
    }

    const transString = enable3D ? `scale3D(${scalerScale}, ${scalerScale}, 0)` :
                                   `scale(${scalerScale})`;
    this.iframeScaler.style.transform = transString;
    this.iframeScaler.style.width = `${scalerWidth}px`;
    this.iframeScaler.style.height = `${scalerHeight}px`;
    this.iframeScaler.style.transformOrigin = enable3D ? '0px 0px 0px' : '0px 0px';

    // Chrome workaround: otherwise text is sometimes invisible
    // (probably a rendering glitch due to the 3D transform graphics backend?)
    // _$epubHtml.css("visibility", "hidden"); // "flashing" in two-page spread mode is annoying :(
    if (this.ePubHtml) {
      this.ePubHtml.style.opacity = '0.9999';
    }

    this.showIFrame();

    setTimeout(
      () => {
        if (this.ePubHtml) {
          this.ePubHtml.style.opacity = '1';
        }
      },
      0);
  }

}
