import { Location } from '../location';
import { LayoutView, PaginationInfo } from './layout-view';
import { getReadiumEventsRelayInstance } from './readium-events-relay';
import { ZoomOptions } from './types';

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

  private hasPendingAction: boolean = false;

  private scrollEnabled: boolean = false;

  private scrollFromInternal: boolean = false;

  constructor(root: HTMLElement) {
    this.root = root;

    this.nextScreen = this.nextScreen.bind(this);
    this.prevScreen = this.prevScreen.bind(this);

    this.bindEvents();
  }

  public setView(v: LayoutView): void {
    this.bookView = v;
    this.bookView.attachToHost(this.root);
  }

  public enableScroll(e: boolean): void {
    this.root.style.overflowX = 'hidden';
    this.root.style.overflowY = 'hidden';
    // tslint:disable-next-line:no-any
    (<any>this.root.style).webkitOverflowScrolling = 'auto';

    // disable scrolling with rtl books for now
    if (this.bookView && this.bookView.isRightToLeft() && !this.bookView.isVerticalLayout()) {
      return;
    }

    this.scrollEnabled = e;
    if (this.scrollEnabled) {
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

  public async renderAtOffset(pos: number): Promise<void> {
    this.hasPendingAction = true;
    this.scrollFromInternal = true;

    // this.viewOffset = pos;
    // this.render();

    this.viewOffset = await this.ensureViewportFilledAtPosition(pos);
    this.adjustScrollPosition();
    this.updatePositions();

    this.hasPendingAction = false;
    this.scrollFromInternal = false;

    // This call is important since the viewoffset and
    // scroller position may out of sync if additonal
    // spine item is loaded
    this.render();

    this.onPagesReady();
  }

  public async renderAtSpineItem(spineItemIndex: number): Promise<void> {
    await this.bookView.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex);
    const pos = this.bookView.getSpineItemViewOffset(spineItemIndex);
    if (pos === undefined) {
      return;
    }

    this.viewOffset = await this.ensureViewportFilledAtPosition(pos);
    this.updatePositions();

    this.adjustScrollPosition();
    this.render();

    this.onPagesReady();
  }

  public async renderAtLocation(loc: Location): Promise<void> {
    const spineItemIndex = this.bookView.findSpineItemIndexByHref(loc.getHref());
    if (spineItemIndex < 0) {
      return;
    }

    await this.bookView.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex);

    const offset = await this.bookView.getOffsetFromLocation(loc);
    if (offset === undefined) {
      return;
    }

    this.viewOffset = await this.ensureViewportFilledAtPosition(offset);
    this.updatePositions();

    this.adjustScrollPosition();
    this.render();

    this.onPagesReady();
  }

  public async renderAtAnchorLocation(href: string, eleId: string): Promise<void> {
    const spineItemIndex = this.bookView.findSpineItemIndexByHref(href);
    if (spineItemIndex < 0) {
      return;
    }

    await this.bookView.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex);

    const offset = await this.bookView.getOffsetFromAnchor(href, eleId);
    if (offset === undefined) {
      return;
    }

    this.viewOffset = await this.ensureViewportFilledAtPosition(offset);
    this.updatePositions();

    this.adjustScrollPosition();
    this.render();

    this.onPagesReady();
  }

  public async nextScreen(): Promise<void> {
    let newPos = this.viewOffset + this.visibleViewportSize;
    const loadedEndPos = this.bookView.getLoadedEndPosition();
    if (newPos > loadedEndPos && !this.bookView.hasMoreAfterEnd()) {
      newPos = loadedEndPos;
    }

    if (newPos !== this.viewOffset &&
        (newPos <= loadedEndPos || this.bookView.hasMoreAfterEnd())) {
      await this.renderAtOffset(this.viewOffset + this.visibleViewportSize);
    }
  }

  public async prevScreen(): Promise<void> {
    let newPos = this.viewOffset - this.getScaledViewportSize();
    const loadedStartPos = this.bookView.getLoadedStartPostion();
    // Ensure not to go beyond begining of the book
    if (newPos < loadedStartPos && !this.bookView.hasMoreBeforeStart()) {
      newPos = loadedStartPos;
    }

    if (newPos !== this.viewOffset &&
        (newPos >= loadedStartPos || this.bookView.hasMoreBeforeStart())) {
      await this.renderAtOffset(newPos);
    }
  }

  public async ensureLoaded(): Promise<void> {
    await this.bookView.ensureLoaded();
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

  // tslint:disable-next-line:no-any
  public getRangeCfiFromDomRange(spineItemIndex: number, range: Range): any {
    const view = this.bookView.getSpineItemView(spineItemIndex);
    if (!view) {
      return undefined;
    }

    return view.getRangeCfiFromDomRange(range);
  }

  // tslint:disable-next-line:no-any
  public getVisibleElements(siIndex: number, selector: string): any {
    const view = this.bookView.getSpineItemView(siIndex);
    if (!view) {
      return undefined;
    }

    return view.getVisibleElements(selector, true);
  }

  // tslint:disable-next-line:no-any
  public getElements(siIndex: number, selector: string): any {
    const view = this.bookView.getSpineItemView(siIndex);
    if (!view) {
      return undefined;
    }

    return view.getElements(selector);
  }

  // tslint:disable-next-line:no-any
  public getElementById(siIndex: number, id: string): any {
    const view = this.bookView.getSpineItemView(siIndex);
    if (!view) {
      return undefined;
    }

    return view.getElementById(id);
  }

  // tslint:disable-next-line:no-any
  public isElementVisible(siIndex: number, $ele: any): boolean {
    return this.bookView.isElementVisible(siIndex, $ele,
                                          this.viewOffset,
                                          this.getScaledViewportSize());
  }

  // tslint:disable-next-line:no-any
  public getNearestCfiFromElement(siIndex: number, element: any): any {
    const view = this.bookView.getSpineItemView(siIndex);
    if (!view) {
      return undefined;
    }

    return view.getNearestCfiFromElement(element);
  }

  public beginViewUpdate(): void {
    this.bookView.beginViewUpdate();
  }

  public async endViewUpdate(): Promise<void> {
    await this.bookView.endViewUpdate();
  }

  private bindEvents(): void {
    this.root.addEventListener('scroll', async (e) => {
      if (!this.scrollEnabled || this.scrollFromInternal) {
        return;
      }

      this.viewOffset = this.scrollOffset();
      // console.log(`offset: ${this.viewOffset}`);

      const start = this.viewOffset - this.prefetchSize;
      const end = this.viewOffset + this.viewportSize + this.prefetchSize;
      if (end >= this.bookView.getLoadedEndPosition() && this.bookView.hasMoreAfterEnd()) {
        await this.ensureConentLoadedAtRange(start, end);
      } else if (start <= this.bookView.getLoadedStartPostion() &&
                 this.bookView.hasMoreBeforeStart()) {
        await this.ensureConentLoadedAtRange(start, end);
      }
    });
  }

  private async ensureConentLoadedAtRange(start: number, end: number): Promise<void> {
    // this.hasPendingAction = true;
    await this.bookView.ensureConentLoadedAtRange(start, end);
    // this.hasPendingAction = false;
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
    if (!this.scrollEnabled) {
      return;
    }

    const adjustment = this.bookView.adjustLoadedConentRangeToPositive();
    if (adjustment === 0) {
      return;
    }

    this.viewOffset -= adjustment;
  }

  private render(): void {
    if (this.scrollEnabled) {
      this.updateScrollFromViewOffset();
    } else {
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

  private async ensureViewportFilledAtPosition(pos: number): Promise<number> {
    const start = pos - this.prefetchSize;
    const end = pos + this.getScaledViewportSize() + this.prefetchSize;
    await this.bookView.ensureConentLoadedAtRange(start, end);

    let newPos = pos;
    if (!this.scrollEnabled) {
      newPos = this.clipToVisibleRange(pos, pos + this.getScaledViewportSize());
    }

    return newPos;
  }

  private clipToVisibleRange(start: number, end: number): number {
    const numOfPagePerSpread = this.bookView.numberOfPagesPerSpread();
    if (numOfPagePerSpread < 1) {
      return start;
    }

    const pageRanges = this.bookView.visiblePages(start, end);
    if (pageRanges.length === 0) {
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

  private onPagesReady(): void {
    if (!this.bookView.hasNewContentLoaded()) {
      return;
    }

    const pageInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
    if (pageInfo.length === 0) {
      return;
    }

    for (const p of pageInfo) {
      const $iframe = p.view.getIframe();
      const spineItem = p.view.getRjsSpineItem();
      if (!$iframe) {
        continue;
      }
      getReadiumEventsRelayInstance().triggerContentDocumentLoaded($iframe, spineItem);
    }

    const rjsPageInfo = pageInfo[0].view.getPaginationInfo();
    getReadiumEventsRelayInstance().triggerPaginationChanged(rjsPageInfo);
  }
}
