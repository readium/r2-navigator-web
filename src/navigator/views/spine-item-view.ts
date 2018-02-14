import { Link } from '../../epub-model/publication-link';
import { IFrameLoader } from '../iframe-loader';
import { View } from './view';

import {
  OnePageView,
  PaginationChangedEventArgs,
  ReflowableView,
  StyleCollection,
  ViewerSettings,
} from 'readium-shared-js';

export class SpineItemPaginationInfo {
  public spineItemPageIndex: number;
}

export class SpineItemView extends View {
  protected host: HTMLElement;

  protected iframeLoader: IFrameLoader;

  protected spine: Link[];
  // tslint:disable-next-line:no-any
  protected rsjSpine: any;

  // tslint:disable-next-line:no-any
  protected rsjViewSettings: any = new ViewerSettings({ syntheticSpread: 'single' });

  protected spineItem: Link;
  protected spineItemIndex: number;
  protected spineItemPageCount: number = 0;

  protected isEmpty: boolean = true;

  protected isVertical: boolean = true;

  protected contentHeight: number = 0;

  // tslint:disable-next-line:no-any
  protected contentViewImpl: any;

  // tslint:disable-next-line:no-any
  public constructor(iframeLoader: IFrameLoader, spine: Link[], rsjSpine: any,
                     isVertical: boolean) {
    super();
    this.iframeLoader = iframeLoader;
    this.spine = spine;
    this.rsjSpine = rsjSpine;
    this.isVertical = isVertical;
  }

  public loadSpineItem(spineItem: Link): Promise<void> {
    this.spineItemIndex = this.spine.indexOf(spineItem);

    const readiumViewParams = {
      $viewport: this.host,
      spine: this.rsjSpine,
      userStyles: new StyleCollection(),
      bookStyles: new StyleCollection(),
      iframeLoader: this.iframeLoader,
      expandDocumentFullWidth: true,
    };
    this.isEmpty = false;

    const reader = {
      fonts: {},
      viewerSettings: () => this.rsjViewSettings,
    };

    if (this.isVertical) {
      return this.loadSpineItemOnePageView(readiumViewParams, reader);
    }

    return this.isVertical ? this.loadSpineItemOnePageView(readiumViewParams, reader) :
                             this.laodSpineItemReflowableView(readiumViewParams, reader);
  }

  public unloadSpineItem(): void {
    while (this.host.firstChild) {
      this.host.removeChild(this.host.firstChild);
    }
    this.isEmpty = true;
  }

  public hasSpineItemLoaded(): boolean {
    return !this.isEmpty;
  }

  public render(): void {
    this.contentViewImpl.render();
  }

  public attatchToHost(host: HTMLElement): void {
    this.host = host;
  }

  public getTotalPageCount(): number {
    return this.spineItemPageCount;
  }

  public getTotalSize(pageWidth: number): number {
    return this.isVertical ? this.contentHeight : this.spineItemPageCount * pageWidth;
  }

  // tslint:disable-next-line:no-any
  private loadSpineItemOnePageView(params: any, reader: any): Promise<void> {
    this.contentViewImpl = new OnePageView(params,
                                           ['content-doc-frame'],
                                           false,
                                           reader);

    this.contentViewImpl.render();

    this.contentViewImpl.setViewSettings(this.rsjViewSettings, true);

    this.host.appendChild(this.contentViewImpl.element()[0]);

    return new Promise((resolve: () => void) => {
      this.contentViewImpl.loadSpineItem(this.rsjSpine.items[this.spineItemIndex],
                                         (success:  boolean) => {
                                           if (success) {
                                             this.onSpineItemOnePageViewLoaded();
                                             resolve();
                                           }
                                         });
    });
  }

  private onSpineItemOnePageViewLoaded(): void {
    this.spineItemPageCount = 1;
    this.contentViewImpl.resizeIFrameToContent();
    this.contentHeight = this.contentViewImpl.getCalculatedPageHeight();
  }

  // tslint:disable-next-line:no-any
  private laodSpineItemReflowableView(params: any, reader: any): Promise<void> {
    this.contentViewImpl = new ReflowableView(params, reader);

    this.contentViewImpl.render();

    this.contentViewImpl.setViewSettings(this.rsjViewSettings, true);

    this.contentViewImpl.openPage({ spineItem: this.rsjSpine.items[this.spineItemIndex] });

    return this.paginationChangedPromise();
  }

  // tslint:disable-next-line:max-line-length
  private paginationChangedHanlder(
    paras: PaginationChangedEventArgs,
    handler: (paras: PaginationChangedEventArgs) => void,
    resolve: () => void,
  ): void {
    const readium = this.getReadium();
    const pageInfo = paras.paginationInfo.openPages[0];
    if (pageInfo.spineItemIndex === this.spineItemIndex) {
      this.contentViewImpl.removeListener(
        readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
        handler,
      );
      this.spineItemPageCount = pageInfo.spineItemPageCount;
      console.log(`spine item ${this.spineItemIndex} loaded: ${this.spineItemPageCount} pages`);
      resolve();
    }
  }

  private paginationChangedPromise(): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const handler = (paras: PaginationChangedEventArgs) => {
        this.paginationChangedHanlder(paras, handler, resolve);
      };
      this.contentViewImpl.on(
        this.getReadium().InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
        handler,
      );
    });
  }

  // tslint:disable-next-line:no-any
  private getReadium(): any {
    // tslint:disable-next-line:no-any
    return (<any>window).ReadiumSDK;
  }
}
