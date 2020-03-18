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
  private contentContainer: HTMLElement;
  private clipContatiner: HTMLElement;

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

    this.init();
    this.bindEvents();
  }

  public addLocationChangedListener(callback: Function): void {
    this.locationChangedCallbacks.push(callback);
  }

  public setView(v: LayoutView): void {
    this.bookView = v;
    this.bookView.attachToHost(this.clipContatiner);
    this.bookView.setViewOffsetGetter(() => {
      return this.viewOffset;
    });
  }

  public reset(): void {
    this.startPos = undefined;
    this.endPos = undefined;
  }

  public setScrollMode(mode: ScrollMode): void {
    this.root.style.overflowX = 'auto';
    this.root.style.overflowY = 'auto';
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

      this.clipContatiner.style.overflow = 'visible';

      // tslint:disable-next-line:no-any
      (<any>this.root.style).webkitOverflowScrolling = 'touch';
    }
  }

  public setViewportSize(size: number, size2nd: number): void {
    this.viewportSize = size;
    this.viewportSize2nd = size2nd;
    this.visibleViewportSize = this.viewportSize;

    if (this.bookView) {
      if (this.bookView.isVerticalLayout()) {
        this.root.style.width = `${this.viewportSize2nd}px`;
        this.root.style.height = `${this.viewportSize}px`;
      } else {
        this.root.style.width = `${this.visibleViewportSize}px`;
        this.root.style.height = `${this.viewportSize2nd}px`;
      }

      this.contentContainer.style.width = this.root.style.width;
      this.contentContainer.style.height = this.root.style.height;

      this.clipContatiner.style.width = this.root.style.width;
      this.clipContatiner.style.height = this.root.style.height;
    }
  }

  public getViewportSize(): number {
    return this.viewportSize;
  }

  public getViewportSize2nd(): number {
    return this.viewportSize2nd;
  }

  public getVisibleViewportSize(): number {
    return this.visibleViewportSize;
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

  public async renderAtAnchorLocation(
    href: string,
    eleId?: string,
    token?: CancellationToken,
  ): Promise<void> {
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

    if (newPos !== this.viewOffset && (newPos <= loadedEndPos || this.bookView.hasMoreAfterEnd())) {
      await this.renderAtOffset(this.viewOffset + this.visibleViewportSize, token);
    }
  }

  public async prevScreen(token?: CancellationToken): Promise<void> {
    let newPos = this.viewOffset - this.visibleViewportSize;
    const loadedStartPos = this.bookView.getLoadedStartPostion();
    // Ensure not to go beyond begining of the book
    if (newPos < loadedStartPos && !this.bookView.hasMoreBeforeStart()) {
      newPos = loadedStartPos;
    }

    if (
      newPos !== this.viewOffset &&
      (newPos >= loadedStartPos || this.bookView.hasMoreBeforeStart())
    ) {
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

  public getBookViewElement(): HTMLElement {
    return this.bookView.containerElement();
  }

  public getSpineItemView(spineItemIndex: number): SpineItemView | undefined {
    return this.bookView.getSpineItemView(spineItemIndex);
  }

  public getOffsetInSpineItemView(siIndex: number): number | undefined {
    return this.bookView.getOffsetInSpineItemView(siIndex, this.viewOffset);
  }

  public onVisiblePagesReady(callback: (cv: IContentView) => void): void {
    this.visiblePagesReadyCallbacks.push(callback);
  }

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

  public onPageSizeChanged(pageWidth: number, numOfPages: number): void {
    if (numOfPages === 0) {
      this.contentContainer.style.width = this.root.style.width;
      return;
    }
    this.contentContainer.style.width = `${pageWidth * numOfPages}px`;
  }

  private onLocationChanged(): void {
    this.locationChangedCallbacks.forEach((eventCb) => eventCb());
  }

  private init(): void {
    this.contentContainer = document.createElement('div');
    this.contentContainer.id = 'viewport-content';
    this.contentContainer.style.margin = 'auto';
    this.contentContainer.style.overflowX = 'hidden';
    this.contentContainer.style.overflowY = 'hidden';
    this.root.appendChild(this.contentContainer);

    this.clipContatiner = document.createElement('div');
    this.clipContatiner.id = 'viewport-clipper';
    this.clipContatiner.style.overflowX = 'hidden';
    this.clipContatiner.style.overflowY = 'hidden';
    this.clipContatiner.style.position = 'absolute';
    this.clipContatiner.style.margin = '';
    this.contentContainer.appendChild(this.clipContatiner);
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
        if (
          (end >= this.bookView.getLoadedEndPosition() && this.bookView.hasMoreAfterEnd()) ||
          (start <= this.bookView.getLoadedStartPostion() && this.bookView.hasMoreBeforeStart())
        ) {
          await this.ensureConentLoadedAtRange(start, end);
          this.adjustScrollPosition();
          await this.onPagesReady(this.scrollRequestToken);
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
    const containerElement = this.bookView.containerElement();
    if (this.scrollMode === ScrollMode.None) {
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
      containerElement.style.transform = 'translateX(0)';
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

  private async ensureViewportFilledAtPosition(
    pos: number,
    token?: CancellationToken,
  ): Promise<number> {
    const start = pos - this.prefetchSize;
    const end = pos + this.getScaledViewportSize() + this.prefetchSize;
    await this.bookView.ensureConentLoadedAtRange(start, end, token);
    if (token && token.isCancelled) {
      return pos;
    }

    let newPos = pos;
    if (this.scrollMode === ScrollMode.None) {
      newPos = this.clipToVisibleRange(pos);
      this.alignClipper(newPos);
    }

    this.updatePositions();

    if (this.scrollMode === ScrollMode.SpineItem) {
      this.showOnlyCurrentSpineItemRange();
    }

    return newPos;
  }

  private async ensureContentLoadedAtSpineItemRange(
    startIndex: number,
    endIndex: number,
    token?: CancellationToken,
  ): Promise<void> {
    this.reset();
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

  private alignClipper(start: number): void {
    this.clipContatiner.style.left = '';
    this.clipContatiner.style.right = '';

    const numOfPagePerSpread = this.bookView.numberOfPagesPerSpread();
    const pageProps = this.bookView.arrangeDoublepageSpreads(start);
    if (pageProps === undefined) {
      return;
    }

    const pages = pageProps.filter((value) => value !== undefined).length;
    if (numOfPagePerSpread === 1 || pageProps[1] === 'center' || pages === 2) {
      // center viewport clipper
      const margin = (this.root.offsetWidth - this.visibleViewportSize) / 2;
      if (margin > 0) {
        this.clipContatiner.style.left = `${margin}px`;
      }
    } else if (pages === 1) {
      // double page view, but only one page displayed
      // e.g., first or last page
      const margin = Math.max(this.root.offsetWidth / 2, this.visibleViewportSize);
      if (pageProps[1] === 'left') {
        this.clipContatiner.style.right = `${margin}px`;
      } else if (pageProps[1] === 'right') {
        this.clipContatiner.style.left = `${margin}px`;
      }
    }
  }

  private clipToVisibleRange(start: number): number {
    const numOfPagePerSpread = this.bookView.numberOfPagesPerSpread();
    if (numOfPagePerSpread < 1) {
      return start;
    }

    let pagesBefore = 0;
    let pagesAfter = numOfPagePerSpread - pagesBefore - 1;
    const doublepageSpreadLayout = this.bookView.arrangeDoublepageSpreads(Math.ceil(start));
    if (numOfPagePerSpread === 2) {
      if (doublepageSpreadLayout) {
        if (doublepageSpreadLayout[1] === 'right') {
          // shift current page all the wait to the right
          pagesBefore = numOfPagePerSpread - 1;
          pagesAfter = numOfPagePerSpread - pagesBefore - 1;
        } else if (doublepageSpreadLayout[1] === 'center') {
          pagesAfter = 0;
        }
      }
    }

    const pageRanges = this.bookView.pageSizes(Math.ceil(start), pagesAfter, pagesBefore);
    pageRanges.sort((page1: [number, number, number], page2: [number, number, number]) => {
      const page1Dist = Math.min(
        Math.abs(this.viewOffset - page1[0]),
        Math.abs(this.viewOffset - page1[1]),
      );
      const page2Dist = Math.min(
        Math.abs(this.viewOffset - page2[0]),
        Math.abs(this.viewOffset - page2[1]),
      );

      return page1Dist - page2Dist;
    });

    const spreadPages = pageRanges.slice(0, numOfPagePerSpread);

    let firstPage = spreadPages[0];
    let lastPage = spreadPages[spreadPages.length - 1];
    if (lastPage[0] < firstPage[0]) {
      [firstPage, lastPage] = [lastPage, firstPage];
    }
    this.visibleViewportSize = lastPage[1] - firstPage[0];
    this.clipContatiner.style.width = `${this.visibleViewportSize}px`;

    let clipperHeight = Math.max(firstPage[2], lastPage[2]);
    if (clipperHeight === 0) {
      // first/last page height hasn't loaded or not set yet
      clipperHeight = this.clipContatiner.scrollHeight;
    }
    this.clipContatiner.style.height = `${clipperHeight}px`;

    return firstPage[0];
  }

  private getScaledViewportSize(): number {
    return this.viewportSize * this.bookView.getZoomScale();
  }

  private getEndOffset(): number {
    let offset = this.viewOffset + this.visibleViewportSize;
    if (offset > this.bookView.getLoadedEndPosition()) {
      offset = this.bookView.getLoadedEndPosition();
    }
    return offset;
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

    const contentView = pageInfo[pageInfo.length - 1].view.getContentView();
    for (const callback of this.visiblePagesReadyCallbacks) {
      callback(contentView);
    }
  }
}
