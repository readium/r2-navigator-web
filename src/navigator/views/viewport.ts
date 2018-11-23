import { Location } from '../location';
import { IContentView } from './content-view/content-view';
import { LayoutView, PaginationInfo } from './layout-view';
import { SpineItemView } from './spine-item-view';
import { CancellationToken } from './types';

type VisiblePagesReadyCallbackType = (cv: IContentView) => void;

export enum ScrollMode {
  None,
  Publication,
  SpineItem,
}

export class Viewport {
  private bookView: LayoutView;

  private viewportSize: number;
  private viewportSize2nd: number;
  private prefetchSize: number = 0;

  private visibleViewportSize: number = 0;

  private viewOffset: number;

  private startPos?: PaginationInfo;
  private endPos?: PaginationInfo;

  private root: HTMLElement;

  private scrollRequestToken?: CancellationToken;

  private scrollMode: ScrollMode = ScrollMode.None;

  private scrollFromInternal: boolean = false;

  private visiblePagesReadyCallbacks: VisiblePagesReadyCallbackType[] = [];

  private locationChangedCallbacks: Function[] = [];

  constructor(root: HTMLElement) {
    this.root = root;

    this.nextScreen = this.nextScreen.bind(this);
    this.prevScreen = this.prevScreen.bind(this);
    this.nextSpineItem = this.nextSpineItem.bind(this);
    this.prevSpineItem = this.prevSpineItem.bind(this);

    this.bindEvents();
  }

  public addLocationChangedListener(callback: Function): void {
    this.locationChangedCallbacks.push(callback);
  }

  public setView(v: LayoutView): void {
    this.bookView = v;
    this.bookView.attachToHost(this.root);
  }

  public setScrollMode(mode: ScrollMode): void {
    this.root.style.overflowX = 'hidden';
    this.root.style.overflowY = 'hidden';
    // tslint:disable-next-line:no-any
    (<any>this.root.style).webkitOverflowScrolling = 'auto';

    // disable scrolling with rtl books for now
    if (this.bookView && this.bookView.isRightToLeft() && !this.bookView.isVerticalLayout()) {
      return;
    }

    this.scrollMode = mode;
    if (this.scrollMode === ScrollMode.Publication || this.scrollMode === ScrollMode.SpineItem) {
      if (this.bookView.isVerticalLayout()) {
        this.root.style.overflowY = 'scroll';
      } else {
        this.root.style.overflowX = 'scroll';
      }

      // tslint:disable-next-line:no-any
      (<any>this.root.style).webkitOverflowScrolling = 'touch';
    }
  }

  public setViewportSize(size: number, size2nd: number): void {
    this.viewportSize = size;
    this.viewportSize2nd = size2nd;
    this.visibleViewportSize = this.viewportSize;
  }

  public getViewportSize(): number {
    return this.viewportSize;
  }

  public getViewportSize2nd(): number {
    return this.viewportSize2nd;
  }

  public setPrefetchSize(size: number): void {
    this.prefetchSize = size;
  }

  public getStartPosition(): PaginationInfo | undefined {
    return this.startPos;
  }

  public getEndPosition(): PaginationInfo | undefined {
    return this.endPos;
  }

  public async renderAtOffset(pos: number, token?: CancellationToken): Promise<void> {
    this.scrollFromInternal = true;

    // this.viewOffset = pos;
    // this.render();

    this.viewOffset = await this.ensureViewportFilledAtPosition(pos, token);
    this.adjustScrollPosition();
    this.updatePositions();

    this.scrollFromInternal = false;

    // This call is important since the viewoffset and
    // scroller position may out of sync if additonal
    // spine item is loaded
    this.render();

    if (token && token.isCancelled) {
      return;
    }

    await this.onPagesReady(token);
    if (token && token.isCancelled) {
      return;
    }

    this.onLocationChanged();

    await this.updatePrefetch(token);
  }

  public async renderAtSpineItem(spineItemIndex: number, token?: CancellationToken): Promise<void> {
    await this.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex, token);
    if (token && token.isCancelled) {
      return;
    }
    const pos = this.bookView.getSpineItemViewOffset(spineItemIndex);
    if (pos === undefined) {
      return;
    }

    this.viewOffset = await this.ensureViewportFilledAtPosition(pos, token);

    this.adjustScrollPosition();
    this.render();

    if (token && token.isCancelled) {
      return;
    }

    await this.onPagesReady(token);
    if (token && token.isCancelled) {
      return;
    }

    this.onLocationChanged();

    await this.updatePrefetch(token);
  }

  public async renderAtLocation(loc: Location, token?: CancellationToken): Promise<void> {
    const spineItemIndex = this.bookView.findSpineItemIndexByHref(loc.getHref());
    if (spineItemIndex < 0) {
      return;
    }

    await this.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex, token);
    if (token && token.isCancelled) {
      return;
    }

    const offset = await this.bookView.getOffsetFromLocation(loc);
    if (offset === undefined) {
      return;
    }

    this.viewOffset = await this.ensureViewportFilledAtPosition(offset, token);

    this.adjustScrollPosition();
    this.render();

    if (token && token.isCancelled) {
      return;
    }

    await this.onPagesReady(token);
    if (token && token.isCancelled) {
      return;
    }

    this.onLocationChanged();

    await this.updatePrefetch(token);
  }

  public async renderAtAnchorLocation(href: string, eleId: string,
                                      token?: CancellationToken): Promise<void> {
    const spineItemIndex = this.bookView.findSpineItemIndexByHref(href);
    if (spineItemIndex < 0) {
      return;
    }

    await this.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex, token);
    if (token && token.isCancelled) {
      return;
    }

    const offset = await this.bookView.getOffsetFromAnchor(href, eleId);
    if (offset === undefined) {
      return;
    }

    this.viewOffset = await this.ensureViewportFilledAtPosition(offset);

    this.adjustScrollPosition();
    this.render();

    if (token && token.isCancelled) {
      return;
    }

    await this.onPagesReady(token);
    if (token && token.isCancelled) {
      return;
    }

    this.onLocationChanged();

    await this.updatePrefetch(token);
  }

  public async nextScreen(token?: CancellationToken): Promise<void> {
    const newPos = this.viewOffset + this.visibleViewportSize;
    const loadedEndPos = this.bookView.getLoadedEndPosition();
    if (newPos >= loadedEndPos && !this.bookView.hasMoreAfterEnd()) {
      return;
    }

    if (newPos !== this.viewOffset &&
        (newPos <= loadedEndPos || this.bookView.hasMoreAfterEnd())) {
      await this.renderAtOffset(this.viewOffset + this.visibleViewportSize, token);
    }
  }

  public async prevScreen(token?: CancellationToken): Promise<void> {
    let newPos = this.viewOffset - this.getScaledViewportSize();
    const loadedStartPos = this.bookView.getLoadedStartPostion();
    // Ensure not to go beyond begining of the book
    if (newPos < loadedStartPos && !this.bookView.hasMoreBeforeStart()) {
      newPos = loadedStartPos;
    }

    if (newPos !== this.viewOffset &&
        (newPos >= loadedStartPos || this.bookView.hasMoreBeforeStart())) {
      await this.renderAtOffset(newPos, token);
    }
  }

  public async nextSpineItem(token?: CancellationToken): Promise<void> {
    if (this.startPos === undefined) {
      return;
    }

    await this.renderAtSpineItem(this.startPos.spineItemIndex + 1, token);
  }

  public async prevSpineItem(token?: CancellationToken): Promise<void> {
    if (this.startPos === undefined) {
      return;
    }

    await this.renderAtSpineItem(this.startPos.spineItemIndex - 1, token);
  }

  public async ensureLoaded(token?: CancellationToken): Promise<void> {
    await this.bookView.ensureLoaded(token);
    this.updatePositions();
  }

  public visibleSpineItemIndexRange(): number[] {
    const indices: number[] = [];
    const startPageInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
    if (startPageInfo.length === 0) {
      return indices;
    }

    const pos = this.getEndOffset();
    const endPageInfo = this.bookView.getPaginationInfoAtOffset(pos);
    if (endPageInfo.length === 0) {
      return indices;
    }

    indices.push(startPageInfo[startPageInfo.length - 1].spineItemIndex);
    indices.push(endPageInfo[0].spineItemIndex);

    return indices;
  }

  public getSpineItemView(spineItemIndex: number): SpineItemView | undefined {
    return  this.bookView.getSpineItemView(spineItemIndex);
  }

  public getOffsetInSpineItemView(siIndex: number): number | undefined {
    return this.bookView.getOffsetInSpineItemView(siIndex, this.viewOffset);
  }

  public onVisiblePagesReady(callback: (cv: IContentView) => void): void {
    this.visiblePagesReadyCallbacks.push(callback);
  }

  // tslint:disable-next-line:no-any
  // public getRangeCfiFromDomRange(spineItemIndex: number, range: Range): any {
  //   const view = this.bookView.getSpineItemView(spineItemIndex);
  //   if (!view) {
  //     return undefined;
  //   }

  //   return view.getRangeCfiFromDomRange(range);
  // }

  // tslint:disable-next-line:no-any
  // public getVisibleElements(siIndex: number, selector: string): any {
  //   const view = this.bookView.getSpineItemView(siIndex);
  //   if (!view) {
  //     return undefined;
  //   }

  //   return view.getVisibleElements(selector, true);
  // }

  // tslint:disable-next-line:no-any
  // public getElements(siIndex: number, selector: string): any {
  //   const view = this.bookView.getSpineItemView(siIndex);
  //   if (!view) {
  //     return undefined;
  //   }

  //   return view.getElements(selector);
  // }

  // tslint:disable-next-line:no-any
  // public getElementById(siIndex: number, id: string): any {
  //   const view = this.bookView.getSpineItemView(siIndex);
  //   if (!view) {
  //     return undefined;
  //   }

  //   return view.getElementById(id);
  // }

  // tslint:disable-next-line:no-any
  // public isElementVisible(siIndex: number, $ele: any): boolean {
  // tslint:disable-next-line:max-line-length
  //   if (!this.bookView.isSpineItemVisible(siIndex, this.viewOffset, this.getScaledViewportSize())) {
  //     return false;
  //   }

  //   const view = this.bookView.getSpineItemView(siIndex);
  //   if (!view) {
  //     return false;
  //   }

  //   const offset = this.bookView.getOffsetInSpineItemView(siIndex, this.viewOffset);

  //   return view.isElementVisible($ele, offset, 0);
  // }

  // tslint:disable-next-line:no-any
  // public getNearestCfiFromElement(siIndex: number, element: any): any {
  //   const view = this.bookView.getSpineItemView(siIndex);
  //   if (!view) {
  //     return undefined;
  //   }

  //   return view.getNearestCfiFromElement(element);
  // }

  public getViewScale(siIndex: number): number {
    const view = this.bookView.getSpineItemView(siIndex);
    if (!view) {
      return 1;
    }

    return view.getScale();
  }

  public beginViewUpdate(): void {
    this.bookView.beginViewUpdate();
  }

  public endViewUpdate(): void {
    this.bookView.endViewUpdate();
  }

  private onLocationChanged(): void {
    this.locationChangedCallbacks.forEach(eventCb => eventCb());
  }

  private bindEvents(): void {
    this.root.addEventListener('scroll', async (e) => {
      if (this.scrollMode === ScrollMode.None || this.scrollFromInternal) {
        return;
      }

      this.viewOffset = this.scrollOffset();
      // console.log(`offset: ${this.viewOffset}`);

      if (this.scrollMode === ScrollMode.Publication) {
        const start = this.viewOffset - this.prefetchSize;
        const end = this.viewOffset + this.viewportSize + this.prefetchSize;
        if ((end >= this.bookView.getLoadedEndPosition() && this.bookView.hasMoreAfterEnd()) ||
          (start <= this.bookView.getLoadedStartPostion() && this.bookView.hasMoreBeforeStart())) {
          await this.ensureConentLoadedAtRange(start, end);
          this.adjustScrollPosition();
        }
      }
      this.render();
    });
  }

  private async ensureConentLoadedAtRange(start: number, end: number): Promise<void> {
    if (this.scrollRequestToken) {
      this.scrollRequestToken.isCancelled = true;
    }
    this.scrollRequestToken = new CancellationToken();
    const t = this.scrollRequestToken;
    await this.bookView.ensureConentLoadedAtRange(start, end, t);
    if (this.scrollRequestToken === t) {
      this.scrollRequestToken = undefined;
    }
    if (!t.isCancelled) {
      await this.bookView.removeOutOfRangeSpineItems(start, end);
    }
  }

  private async updatePrefetch(token?: CancellationToken): Promise<void> {
    const start = this.viewOffset - this.prefetchSize;
    const end = this.viewOffset + this.getScaledViewportSize() + this.prefetchSize;
    this.bookView.removeOutOfRangeSpineItems(start, end);

    await this.bookView.ensureConentLoadedAtRange(start, end, token);
    this.updatePositions();

    if (this.scrollMode === ScrollMode.SpineItem) {
      this.showOnlyCurrentSpineItemRange();
    }
  }

  private updatePositions(): void {
    const startInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
    if (startInfo.length > 0) {
      this.startPos = startInfo[startInfo.length - 1];
    } else {
      this.startPos = undefined;
    }

    const endPos = this.getEndOffset();
    const endInfo = this.bookView.getPaginationInfoAtOffset(endPos);
    if (endInfo.length > 0) {
      this.endPos = endInfo[0];
    } else {
      this.endPos = undefined;
    }
  }

  private adjustScrollPosition(): void {
    if (this.scrollMode !== ScrollMode.Publication) {
      return;
    }

    this.scrollFromInternal = true;
    const adjustment = this.bookView.adjustLoadedConentRangeToPositive();
    this.scrollFromInternal = false;
    if (adjustment === 0) {
      return;
    }

    this.viewOffset -= adjustment;
  }

  private render(): void {
    if (this.scrollMode === ScrollMode.None) {
      const containerElement = this.bookView.containerElement();
      let transformString: string;
      if (this.bookView.isVerticalLayout()) {
        transformString = `translateY(${-this.viewOffset}px)`;
      } else {
        if (this.bookView.isRightToLeft()) {
          const offset = this.getEndOffset();
          transformString = `translateX(${offset}px)`;
        } else {
          transformString = `translateX(${-this.viewOffset}px)`;
        }
      }

      containerElement.style.transform = transformString;
    } else {
      this.updateScrollFromViewOffset();
    }

    this.updatePositions();
  }

  private scrollOffset(): number {
    return this.bookView.isVerticalLayout() ? this.root.scrollTop : this.root.scrollLeft;
  }

  private updateScrollFromViewOffset(): void {
    if (this.bookView.isVerticalLayout()) {
      this.root.scrollTop = this.viewOffset;
    } else {
      this.root.scrollLeft = this.viewOffset;
    }
  }

  private async ensureViewportFilledAtPosition(pos: number,
                                               token?: CancellationToken): Promise<number> {
    const start = pos - this.prefetchSize;
    const end = pos + this.getScaledViewportSize() + this.prefetchSize;
    await this.bookView.ensureConentLoadedAtRange(start, end, token);
    if (token && token.isCancelled) {
      return pos;
    }

    let newPos = pos;
    if (this.scrollMode === ScrollMode.None) {
      newPos = this.clipToVisibleRange(pos, pos + this.getScaledViewportSize());
    }

    this.updatePositions();

    if (this.scrollMode === ScrollMode.SpineItem) {
      this.showOnlyCurrentSpineItemRange();
    }

    return newPos;
  }

  private async ensureContentLoadedAtSpineItemRange(startIndex: number, endIndex: number,
                                                    token?: CancellationToken): Promise<void> {
    await this.bookView.ensureContentLoadedAtSpineItemRange(startIndex, endIndex, token);
    if (token && token.isCancelled) {
      return;
    }

    if (this.scrollMode === ScrollMode.SpineItem) {
      this.bookView.showOnlySpineItemRange(startIndex);
      this.viewOffset = 0;
    }
  }

  private showOnlyCurrentSpineItemRange(): void {
    if (!this.startPos) {
      return;
    }

    this.bookView.showOnlySpineItemRange(this.startPos.spineItemIndex);
  }

  private clipToVisibleRange(start: number, end: number): number {
    const numOfPagePerSpread = this.bookView.numberOfPagesPerSpread();
    if (numOfPagePerSpread < 1) {
      return start;
    }

    const pageRanges = this.bookView.visiblePages(start, end);
    if (pageRanges.length < numOfPagePerSpread) {
      return start;
    }

    pageRanges.sort((page1: [number, number], page2: [number, number]) => {
      const page1Dist = Math.min(Math.abs(this.viewOffset - page1[0]),
                                 Math.abs(this.viewOffset - page1[1]));
      const page2Dist = Math.min(Math.abs(this.viewOffset - page2[0]),
                                 Math.abs(this.viewOffset - page2[1]));

      return page1Dist - page2Dist;
    });

    const spreadPages = pageRanges.slice(0, numOfPagePerSpread);

    let firstPage = spreadPages[0];
    let lastPage = spreadPages[spreadPages.length - 1];
    if (lastPage[0] < firstPage[0]) {
      [firstPage, lastPage] = [lastPage, firstPage];
    }
    this.visibleViewportSize = lastPage[1] - firstPage[0];
    this.root.style.width = `${this.visibleViewportSize}px`;
    this.root.style.height = `${this.viewportSize2nd * this.bookView.getZoomScale()}px`;

    return firstPage[0];
  }

  private getScaledViewportSize(): number {
    return this.viewportSize * this.bookView.getZoomScale();
  }

  private getEndOffset(): number {
    return this.viewOffset + this.getScaledViewportSize();
  }

  private async onPagesReady(token?: CancellationToken): Promise<void> {
    // Make sure all spine items are loaded so all CONTENT_DOCUMENT_LOADED
    // have been emitted
    await this.bookView.ensureLoaded(token);
    if (token && token.isCancelled) {
      return;
    }

    const pageInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
    if (pageInfo.length === 0) {
      return;
    }

    const contentView = pageInfo[0].view.getContentView();
    for (const callback of this.visiblePagesReadyCallbacks) {
      callback(contentView);
    }
  }
}
