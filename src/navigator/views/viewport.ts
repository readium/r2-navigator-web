import { LayoutView, PaginationInfo } from './layout-view';
import { View } from './view';

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

  constructor(root: HTMLElement) {
    this.root = root;

    this.nextScreen = this.nextScreen.bind(this);
    this.prevScreen = this.prevScreen.bind(this);

    this.bindEvents();
  }

  public setView(v: LayoutView): void {
    this.bookView = v;
    this.bookView.attatchToHost(this.root);
  }

  public enableScroll(e: boolean): void {
    this.root.style.overflowX = 'hidden';
    this.root.style.overflowY = 'hidden';
    // tslint:disable-next-line:no-any
    (<any>this.root.style).webkitOverflowScrolling = 'auto';

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

    this.viewOffset = pos;
    this.render();

    const start = pos - this.prefetchSize;
    const end = pos + this.viewportSize + this.prefetchSize;
    await this.bookView.ensureConentLoadedAtRange(start, end);
    this.updatePositions();

    this.hasPendingAction = false;
  }

  public async renderAtSpineItem(spineItemIndex: number): Promise<void> {
    await this.bookView.ensureContentLoadedAtSpineItemRange(spineItemIndex, spineItemIndex);
    this.viewOffset = 0;

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

  private bindEvents(): void {
    this.root.addEventListener('scroll', async (e) => {
      if (!this.scrollEnabled) {
        return;
      }

      this.viewOffset = this.scrollOffset();
      // console.log(`offset: ${this.viewOffset}`);
      if (this.hasPendingAction) {
        return;
      }

      const start = this.viewOffset - this.prefetchSize;
      const end = this.viewOffset + this.viewportSize + this.prefetchSize;
      if (end >= this.bookView.loadedRangeLength() && this.bookView.hasMoreAfterEnd()) {
        await this.ensureConentLoadedAtRange(this.viewOffset, end);
      } else if (start <= 0 && this.bookView.hasMoreBeforeStart()) {
        await this.ensureConentLoadedAtRange(start, this.viewOffset);
      }
    });
  }

  private async ensureConentLoadedAtRange(start: number, end: number): Promise<void> {
    this.hasPendingAction = true;
    await this.bookView.ensureConentLoadedAtRange(start, end);
    this.hasPendingAction = false;
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
      if (this.bookView.isVerticalLayout()) {
        containerElement.style.transform = `translateY(${-this.viewOffset}px)`;
      } else {
        containerElement.style.transform = `translateX(${-this.viewOffset}px)`;
      }
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
}
