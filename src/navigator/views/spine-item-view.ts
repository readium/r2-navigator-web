import { Link } from 'r2-webpub-model-js/lib/models/link';
import { IContentView } from './content-view/content-view';
import { IContentViewFactory } from './content-view/content-view-factory';
import { ViewSettings } from './view-settings';

import { CancellationToken, ZoomOptions } from './types';
import { View } from './view';

export enum ContentLoadingStatus {
  NotLoaded,
  Loading,
  Loaded,
}

/* tslint:disable:no-any */

export class SpineItemView extends View {
  protected host: HTMLElement;

  protected spine: Link[];

  protected cvFactory: IContentViewFactory;

  protected spineItem: Link;
  protected spineItemIndex: number;
  protected spineItemPageCount: number = 0;

  protected isInUse: boolean = true;

  protected contentStatus: ContentLoadingStatus = ContentLoadingStatus.NotLoaded;

  protected isVertical: boolean = true;

  protected isFixedLayout: boolean = false;
  protected scaleOption: ZoomOptions = ZoomOptions.FitByPage;
  protected scale: number = 1;

  protected contentHeight: number = 0;

  protected contentView: IContentView;

  public constructor(
    spine: Link[],
    isVertical: boolean,
    isFixedLayout: boolean,
    cvFactory: IContentViewFactory,
  ) {
    super();
    this.spine = spine;
    this.isVertical = isVertical;
    this.isFixedLayout = isFixedLayout;
    this.cvFactory = cvFactory;
  }

  public getContentView(): IContentView {
    return this.contentView;
  }

  public getOffsetFromCfi(cfi: string): number {
    if (cfi === '') {
      return 0;
    }

    return this.contentView.getOffsetFromCfi(cfi);
  }

  public getPageIndexOffsetFromCfi(cfi: string): number {
    if (cfi === '') {
      return 0;
    }

    return this.contentView.getPageIndexOffsetFromCfi(cfi);
  }

  public getOffsetFromElementId(elementId: string): number {
    if (elementId === '') {
      return 0;
    }

    return this.contentView.getOffsetFromElementId(elementId);
  }

  public getPageIndexOffsetFromElementId(elementId: string): number {
    if (elementId === '') {
      return 0;
    }

    return this.contentView.getPageIndexOffsetFromElementId(elementId);
  }

  public async loadSpineItem(spineItem: Link,
                             viewSettings: ViewSettings,
                             token?: CancellationToken): Promise<void> {
    this.contentView = this.cvFactory.createContentView(this.isFixedLayout, this.isVertical);
    this.contentView.attachToHost(this.host);
    this.contentStatus = ContentLoadingStatus.Loading;
    await this.contentView.loadSpineItem(spineItem,
                                         this.spine.indexOf(spineItem),
                                         viewSettings,
                                         token);

    this.contentStatus = ContentLoadingStatus.Loaded;
    this.onViewChanged();
  }

  public unloadSpineItem(): void {
    this.contentView.unloadSpineItem();
    while (this.host.firstChild) {
      this.host.removeChild(this.host.firstChild);
    }
    this.isInUse = false;
  }

  public isSpineItemInUse(): boolean {
    return this.isInUse;
  }

  public fixedLayout(): boolean {
    return this.isFixedLayout;
  }

  public ensureContentLoaded(token?: CancellationToken): Promise<void> {
    if (this.contentStatus === ContentLoadingStatus.Loaded) {
      return Promise.resolve();
    }

    if (this.contentStatus === ContentLoadingStatus.Loading) {
      return this.contentView.spineItemLoadedPromise(token);
    }

    return Promise.reject('Not loaded');
  }

  public resize(pageWidth: number, pageHeight: number): void {
    if (this.isFixedLayout) {
      this.resizeFixedLayoutPage(this.scaleOption, pageWidth, pageHeight);
    } else {
      this.contentView.onResize();
      this.onViewChanged();
    }
  }

  public getScale(): number {
    return this.scale;
  }

  public setZoomOption(option: ZoomOptions): void {
    this.scaleOption = option;
  }

  public resizeFixedLayoutPage(option: ZoomOptions, pageWidth: number, pageHeight: number): void {
    this.scaleOption = option;

    const hScale = pageWidth / this.contentView.metaWidth();
    const vScale = pageHeight / this.contentView.metaHeight();
    if (this.scaleOption === ZoomOptions.FitByPage) {
      this.scale = this.isVertical ? hScale : Math.min(hScale, vScale);
    } else if (this.scaleOption === ZoomOptions.FitByWidth) {
      this.scale = hScale;
    } else if (this.scaleOption === ZoomOptions.FitByHeight) {
      this.scale = vScale;
    }

    this.updateScale();
  }

  public setViewSettings(viewSetting: ViewSettings): void {
    this.contentView.setViewSettings(viewSetting);
    this.onViewChanged();
  }

  public render(): void {
    this.contentView.render();
  }

  public attachToHost(host: HTMLElement): void {
    this.host = host;
  }

  public getTotalPageCount(): number {
    return this.spineItemPageCount;
  }

  public setTotalPageCount(count: number): void {
    this.spineItemPageCount = count;
  }

  public getTotalSize(pageWidth: number): number {
    if (this.isVertical) {
      if (this.isFixedLayout) {
        return this.contentView.metaHeight() * this.scale;
      }

      return this.contentHeight;
    }

    if (this.isFixedLayout) {
      return this.contentView.metaWidth() * this.scale;
    }

    return this.contentView.spineItemPageCount() * pageWidth;
  }

  public getPageSize(pageWidth: number): number {
    if (this.isVertical) {
      if (this.isFixedLayout) {
        return this.contentView.metaHeight() * this.scale;
      }

      return this.contentHeight;
    }

    if (this.isFixedLayout) {
      return this.contentView.metaWidth() * this.scale;
    }

    return pageWidth;
  }

  public getCfi(offsetMain: number, offset2nd: number): string {
    return this.contentView.getCfi(offsetMain, offset2nd);
  }

  // public getPaginationInfo(): object {
  //   return {
  //     paginationInfo: this.contentViewImpl.getPaginationInfo(),
  //     initiator: this,
  //     spineItem: this.contentViewImpl.getLoadedSpineItems()[0],
  //     elementId: undefined,
  //   };
  // }

  // public getRangeCfiFromDomRange(range: Range): any {
  //   return this.contentViewImpl.getRangeCfiFromDomRange(range);
  // }

  // public getVisibleElements(selector: string, includeSpineItems: boolean): any {
  //   return this.contentViewImpl.getVisibleElements(selector, includeSpineItems);
  // }

  // public getElements(selector: string): any {
  //   return this.contentViewImpl.getElements(this.spineItem.Href, selector);
  // }

  // public getElementById(id: string): any {
  //   return this.contentViewImpl.getElementById(this.spineItem.Href, id);
  // }

  // public isElementVisible($ele: any, offsetMain: number, offset2nd: number): boolean {
  //   const navLogic = this.contentViewImpl.getNavigator();

  //   const visOffset = this.isVertical ? { top: -offsetMain, left: offset2nd } :
  //                                       { top: offset2nd, left: -offsetMain };

  //   return navLogic.isElementVisible($ele, visOffset);
  // }

  // public getNearestCfiFromElement(element: any): any {
  //   const navLogic = this.contentViewImpl.getNavigator();

  //   return navLogic.getNearestCfiFromElement(element);
  // }

  // public getIframe(): any {
  //   return this.$iframe;
  // }

  // public getRjsSpineItem(): any {
  //   return this.rjsSpineItem;
  // }

  // tslint:disable-next-line:no-any
  // private loadSpineItemReflowableView(params: any, reader: any,
  //                                     token?: CancellationToken): Promise<void> {
  //   this.contentViewImpl = new ReflowableView(params, reader);

  //   this.handleDocumentContentLoaded();

  //   getReadiumEventsRelayInstance().registerEvents(this.contentViewImpl);

  //   this.contentViewImpl.render();

  //   this.contentViewImpl.setViewSettings(this.rsjViewSettings, true);

  //   this.contentViewImpl.openPage({ spineItem: this.rsjSpine.items[this.spineItemIndex] });

  //   return this.paginationChangedPromise(token);
  // }

  // private paginationChangedHanlder(
  //   paras: PaginationChangedEventArgs,
  //   handler: (paras: PaginationChangedEventArgs) => void,
  //   resolve: () => void,
  //   token?: CancellationToken,
  // ): void {
  //   const pageInfo = paras.paginationInfo.openPages[0];
  //   if (pageInfo.spineItemIndex === this.spineItemIndex) {
  //     this.contentViewImpl.removeListener(
  //       Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
  //       handler,
  //     );
  //     this.spineItemPageCount = pageInfo.spineItemPageCount;
  //     this.contentStatus = ContentLoadingStatus.Loaded;
  //     console.log(`spine item ${this.spineItemIndex} loaded: ${this.spineItemPageCount} pages`);
  //     resolve();
  //   }
  // }

  // private paginationChangedPromise(token?: CancellationToken): Promise<void> {
  //   return new Promise<void>((resolve: () => void) => {
  //     const handler = (paras: PaginationChangedEventArgs) => {
  //       this.paginationChangedHanlder(paras, handler, resolve, token);
  //     };
  //     this.contentViewImpl.on(
  //       Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
  //       handler,
  //     );
  //   });
  // }

  // private handleDocumentContentLoaded(): void {
  //   this.contentViewImpl.on(Readium.Events.CONTENT_DOCUMENT_LOADED,
  //                           ($iframe: any, spineItem: any) => {
  //                             this.$iframe = $iframe;
  //                             this.rjsSpineItem = spineItem;
  //                           });
  // }

  // private contentSizeChangedHandler(iframe: any, spineItem: any, handler: any,
  //                                   resolve: () => void): void {
  //   if (this.rsjSpine.items[this.spineItemIndex] !== spineItem) {
  //     return;
  //   }

  //   this.contentViewImpl.resizeIFrameToContent();
  //   this.contentHeight = this.contentViewImpl.getCalculatedPageHeight();

  //   this.contentViewImpl.removeListener(
  //     OnePageView.Events.CONTENT_SIZE_CHANGED,
  //     handler,
  //   );
  //   resolve();
  // }

  // private contentSizeChangedPromise(): Promise<void> {
  //   return new Promise<void>((resolve: () => void) => {
  //     // tslint:disable-next-line:no-any
  //     const handler = (iframe: any, spineItem: any) => {
  //       this.contentSizeChangedHandler(iframe, spineItem, handler, resolve);
  //     };
  //     this.contentViewImpl.on(
  //       OnePageView.Events.CONTENT_SIZE_CHANGED,
  //       handler,
  //     );
  //   });
  // }

  private onViewChanged(): void {
    this.spineItemPageCount = this.contentView.spineItemPageCount();
    if (this.isVertical) {
      this.contentHeight = this.contentView.calculatedHeight();
      this.host.style.height = `${this.contentHeight}px`;
    }
  }

  private updateScale(): void {
    if (!this.isFixedLayout) {
      return;
    }

    this.contentView.scale(this.scale);
    this.host.style.width = `${this.contentView.metaWidth() * this.scale}px`;
  }
}
