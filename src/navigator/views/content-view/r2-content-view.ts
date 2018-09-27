import { PublicationLink } from '@evidentpoint/r2-shared-js';
import { IFrameLoader } from '../../iframe-loader';
import { CfiNavigationLogic } from '../cfi/cfi-navigation-logic';
import { ElementBlacklistedChecker } from '../cfi/element-checker';
import { CancellationToken } from '../types';
import { ViewSettings } from '../view-settings';
import { IContentView } from './content-view';

type IframeLoadedCallback = (success: boolean) => void;

export class R2ContentView implements IContentView {
  protected host: HTMLElement;

  protected iframeLoader: IFrameLoader;

  protected iframeContainer: HTMLElement;
  protected iframe: HTMLIFrameElement;

  protected iframeLoadedCallbacks: IframeLoadedCallback[] = [];

  protected spineItem: PublicationLink;
  protected spineItemIndex: number;
  protected spineItemPgCount: number = 1;

  protected ePubHtml: HTMLHtmlElement | null = null;
  protected ePubBody: HTMLBodyElement | null = null;

  protected useReadiumCss: boolean = true;
  protected vs: ViewSettings;

  protected elementChecker: ElementBlacklistedChecker;
  protected cfiNavLogic: CfiNavigationLogic;

  public constructor(loader: IFrameLoader, eleChecker: ElementBlacklistedChecker) {
    this.iframeLoader = loader;
    this.elementChecker = eleChecker;
  }

  public render(): void {
    throw new Error('Method not implemented.');
  }

  public loadSpineItem(spineItem: PublicationLink, spineItemIndex: number,
                       viewSettings: ViewSettings,
                       token?: CancellationToken | undefined): Promise<void> {
    this.spineItem = spineItem;
    this.spineItemIndex = spineItemIndex;
    this.vs = viewSettings;

    this.render();

    this.hideIframe();

    const onIframeContentLoaded = (success: boolean) => {
      this.onIframeLoaded(success);
    };

    this.iframeLoader.loadIframe(this.iframe,
                                 spineItem.Href,
                                 onIframeContentLoaded,
                                 { useReadiumCss: this.useReadiumCss },
                                 spineItem.TypeLink);

    return this.iframeLoadedPromise();
  }

  public spineItemLoadedPromise(token?: CancellationToken | undefined): Promise<void> {
    return this.iframeLoadedPromise();
  }

  public unloadSpineItem(): void {
    this.host.removeChild(this.iframeContainer);
  }

  public attachToHost(host: HTMLElement): void {
    this.host = host;
  }

  public setViewSettings(viewSetting: ViewSettings): void {
    if (!this.ePubHtml) {
      return;
    }

    viewSetting.updateView(this.ePubHtml);
  }

  public scale(scale: number): void {
    throw new Error('Method not implemented.');
  }

  public element(): HTMLElement {
    return this.iframeContainer;
  }

  public metaWidth(): number {
    throw new Error('Method not implemented.');
  }

  public metaHeight(): number {
    throw new Error('Method not implemented.');
  }

  public calculatedHeight(): number {
    return 0;
  }

  public spineItemPageCount(): number {
    return this.spineItemPgCount;
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

  public onResize(): void {
    return;
  }

  protected setupIframe(): void {
    this.iframeContainer.style.transform = 'none';
    this.iframe.width = '100%';
    this.iframe.height = '100%';
  }

  protected hideIframe(): void {
    this.iframe.style.visibility = 'hidden';
  }

  protected showIFrame(): void {
    this.iframe.style.visibility = 'visible';
    this.iframe.style.left = '0px';
    this.iframe.style.top = '0px';
  }

  protected iframeLoadedPromise(token?: CancellationToken): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const listener = (success: boolean) => {
        resolve();
      };

      this.iframeLoadedCallbacks.push(listener);
    });
  }

  protected onIframeLoaded(success: boolean): void {
    for (const callback of this.iframeLoadedCallbacks) {
      callback(success);
    }
    this.iframeLoadedCallbacks = [];

    const doc = <Document>this.iframe.contentDocument;
    this.cfiNavLogic = new CfiNavigationLogic(doc, this.elementChecker);
  }
}
