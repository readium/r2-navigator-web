import { PublicationLink } from '@evidentpoint/r2-shared-js';
import {
  Globals as Readium,
  PaginationChangedEventArgs,
  StyleCollection,
} from '@evidentpoint/readium-shared-js';

import { IFrameLoader } from '../../iframe-loader';
import { getReadiumEventsRelayInstance } from '../readium-events-relay';
import { CancellationToken } from '../types';
import { IContentView } from './content-view';

// tslint:disable:no-any

export class R1ContentView implements IContentView {
  protected iframeLoader: IFrameLoader;

  protected host: HTMLElement;

  protected contentViewImpl: any;

  protected rsjSpine: any;
  protected rsjViewSettings: any;
  protected $iframe: any;
  protected rjsSpineItem: any;

  protected spineItem: PublicationLink;
  protected spineItemIndex: number;
  protected spineItemPgCount: number = 1;

  public constructor(iframeLoader: IFrameLoader, rsjSpine: any, rsjViewSetting: any) {
    this.iframeLoader = iframeLoader;
    this.rsjSpine = rsjSpine;
    this.rsjViewSettings = rsjViewSetting;
  }

  public attachToHost(host: HTMLElement): void {
    this.host = host;
  }
  public render(): void {
    this.contentViewImpl.render();
  }

  public element(): HTMLElement {
    return <HTMLElement>(this.contentViewImpl.element()[0]);
  }

  public metaWidth(): number {
    return 0;
  }

  public metaHeight(): number {
    return 0;
  }

  public calculatedHeight(): number {
    return 0;
  }

  public spineItemPageCount(): number {
    return this.spineItemPgCount;
  }

  public getPageIndexOffsetFromCfi(cfi: string): number {
    return this.contentViewImpl.getPageIndexOffsetFromCfi(cfi);
  }

  public getPageIndexOffsetFromElementId(elementId: string): number {
    return this.contentViewImpl.getNavigator().getPageIndexDeltaForElementId(elementId);
  }

  public getCfi(offsetMain: number, offset2nd: number): string {
    const navLogic = this.contentViewImpl.getNavigator();

    return navLogic.getFirstVisibleCfi({ top: offset2nd, left: -offsetMain });
  }

  public getRangeCfiFromDomRange(range: Range): any {
    return this.contentViewImpl.getRangeCfiFromDomRange(range);
  }

  public getVisibleElements(selector: string, includeSpineItems: boolean): any {
    return this.contentViewImpl.getVisibleElements(selector, includeSpineItems);
  }

  public getElements(selector: string): any {
    return this.contentViewImpl.getElements(this.spineItem.Href, selector);
  }

  public getElementById(id: string): any {
    return this.contentViewImpl.getElementById(this.spineItem.Href, id);
  }

  public isElementVisible($ele: any, offsetMain: number, offset2nd: number): boolean {
    const navLogic = this.contentViewImpl.getNavigator();

    return navLogic.isElementVisible($ele, { top: offset2nd, left: -offsetMain });
  }

  public getNearestCfiFromElement(element: any): any {
    const navLogic = this.contentViewImpl.getNavigator();

    return navLogic.getNearestCfiFromElement(element);
  }

  public getPaginationInfo(): object {
    return {
      paginationInfo: this.contentViewImpl.getPaginationInfo(),
      initiator: this,
      spineItem: this.contentViewImpl.getLoadedSpineItems()[0],
      elementId: undefined,
    };
  }

  public async loadSpineItem(spineItem: PublicationLink, spineItemIndex: number,
                             token?: CancellationToken): Promise<void> {
    this.spineItem = spineItem;
    this.spineItemIndex = spineItemIndex;

    const readiumViewParams = {
      $viewport: this.host,
      spine: this.rsjSpine,
      userStyles: new StyleCollection(),
      bookStyles: new StyleCollection(),
      iframeLoader: this.iframeLoader,
      expandDocumentFullWidth: true,
    };

    const reader = {
      fonts: {},
      viewerSettings: () => this.rsjViewSettings,
      needsFixedLayoutScalerWorkAround: () => false,
    };

    return this.loadSpineItemContentViewImpl(readiumViewParams, reader, token);
  }

  public spineItemLoadedPromise(token?: CancellationToken): Promise<void> {
    return this.paginationChangedPromise(token);
  }

  public unloadSpineItem(): void {
    getReadiumEventsRelayInstance().unregisterEvents(this.contentViewImpl);
  }

  public setViewSettings(viewSetting: object): void {
    this.rsjViewSettings = viewSetting;

    this.contentViewImpl.setViewSettings(this.rsjViewSettings);

    const pageInfo = this.contentViewImpl.getPaginationInfo().openPages[0];
    this.spineItemPgCount = pageInfo.spineItemPageCount;
  }

  public scale(scale: number): void {
    return;
  }

  public onResize(): void {
    this.contentViewImpl.onViewportResize();

    const pageInfo = this.contentViewImpl.getPaginationInfo().openPages[0];
    this.spineItemPgCount = pageInfo.spineItemPageCount;
  }

  protected loadSpineItemContentViewImpl(params: any, reader: any,
                                         token?: CancellationToken): Promise<void> {
    // Should be provided in subclass
    return Promise.resolve();
  }

  protected paginationChangedHanlder(
    paras: PaginationChangedEventArgs,
    handler: (paras: PaginationChangedEventArgs) => void,
    resolve: () => void,
    token?: CancellationToken,
  ): void {
    const pageInfo = paras.paginationInfo.openPages[0];
    if (pageInfo.spineItemIndex === this.spineItemIndex) {
      this.contentViewImpl.removeListener(
        Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
        handler,
      );
      this.spineItemPgCount = pageInfo.spineItemPageCount;
      console.log(`spine item ${this.spineItemIndex} loaded: ${this.spineItemPgCount} pages`);
      resolve();
    }
  }

  protected paginationChangedPromise(token?: CancellationToken): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const handler = (paras: PaginationChangedEventArgs) => {
        this.paginationChangedHanlder(paras, handler, resolve, token);
      };
      this.contentViewImpl.on(
        Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
        handler,
      );
    });
  }
}
