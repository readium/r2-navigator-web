import { Location } from '../location';
import { LayoutView, PaginationInfo } from './layout-view';
import { getReadiumEventsRelayInstance } from './readium-events-relay';

export class Viewport {
  private bookView: LayoutView;

  private viewportSize: number;
  private prefetchSize: number = 0;

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

  public getViewportSize(): number {
    return this.viewportSize;
  }

  public setViewportSize(size: number): void {
    this.viewportSize = size;
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

    this.viewOffset = pos;
    this.render();

    const start = pos - this.prefetchSize;
    const end = pos + this.viewportSize + this.prefetchSize;
    await this.ensureConentLoadedAtRange(start, end);
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
    this.viewOffset = 0;

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

    this.viewOffset = offset;
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

    this.viewOffset = offset;
    this.render();
  }

  public async nextScreen(): Promise<void> {
    let newPos = this.viewOffset + this.viewportSize;
    const loadedEndPos = this.bookView.getLoadedEndPosition();
    if (newPos > loadedEndPos && !this.bookView.hasMoreAfterEnd()) {
      newPos = loadedEndPos;
    }

    if (newPos !== this.viewOffset &&
        (newPos <= loadedEndPos || this.bookView.hasMoreAfterEnd())) {
      await this.renderAtOffset(this.viewOffset + this.viewportSize);
    }
  }

  public async prevScreen(): Promise<void> {
    let newPos = this.viewOffset - this.viewportSize;
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

    const endInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset + this.viewportSize);
    if (endInfo.length > 0) {
      this.endPos = endInfo[0];
    } else {
      this.endPos = undefined;
    }
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
          const offset = this.viewOffset + this.viewportSize;
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

  private onPagesReady(): void {
    const pageInfo = this.bookView.getPaginationInfoAtOffset(this.viewOffset);
    if (pageInfo.length === 0) {
      return;
    }

    const rjsPageInfo = pageInfo[0].view.getPaginationInfo();
    getReadiumEventsRelayInstance().triggerPaginationChanged(rjsPageInfo);
  }
}
