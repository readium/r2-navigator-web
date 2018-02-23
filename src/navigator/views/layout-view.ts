import { Publication } from '../../streamer/publication';
import { PackageDocument } from '../../streamer/readium-share-js-impl/package-document';
import { IFrameLoader } from '../iframe-loader';
import { SpineItemView } from './spine-item-view';
import { View } from './view';

// tslint:disable-next-line:no-implicit-dependencies
import { Package as ReadiumPackage, ViewerSettings } from 'readium-shared-js';

export class PaginationInfo {
  public spineItemIndex: number;
  public spineItemPageCount: number;
  public pageIndex: number;
  public view: SpineItemView;
  public offsetInView: number;
}

class SpineItemViewStatus {
  public view: SpineItemView;
  public viewContainer: HTMLElement;
  public spineItemIndex: number;
  public offset: number;
  public viewSize: number;
}

export class LayoutView extends View {
  private spineItemViewStatus: SpineItemViewStatus[] = [];
  private spineItemViewSizes: number[] = [];

  private host: HTMLElement;
  private layoutRoot: HTMLElement;

  private publication: Publication;

  // tslint:disable-next-line:no-any
  private rsjPackage: any;

  // tslint:disable-next-line:no-any
  private rsjViewSettings: any = new ViewerSettings({ syntheticSpread: 'single' });
  private isViewSettingChanged: boolean = false;

  private iframeLoader: IFrameLoader;

  private loadedContentRange: [number, number] = [0, 0];
  private paginatedRange: [number, number] = [0, 0];

  private pageWidth: number = 600;
  private pageHeight: number = 800;
  private isPageSizeChanged: boolean = false;

  private isVertical: boolean = false;

  private hasUnknownSizeSpineItemLoading: boolean = false;

  public constructor(pub: Publication) {
    super();
    this.publication = pub;
    this.iframeLoader = new IFrameLoader(this.publication.baseUri);
    this.initSpineItemViews();

    // tslint:disable-next-line:prefer-array-literal
    this.spineItemViewSizes = new Array<number>(pub.Spine.length).fill(-1);

    const packageDoc = new PackageDocument(this.publication);
    this.rsjPackage = new ReadiumPackage({ ...packageDoc.getSharedJsPackageData() });
    this.rsjPackage.spine.handleLinear(true);
  }

  public setPageSize(width: number, height: number): void {
    this.pageWidth = width;
    this.pageHeight = height;
    if (!this.isVertical) {
      this.layoutRoot.style.height = `${height}px`;
    } else {
      this.layoutRoot.style.width = `${width}px`;
    }
    this.isPageSizeChanged = true;

    this.rePaginate();

    this.isPageSizeChanged = false;
  }

  public async updateViewSettings(viewSetting: object): Promise<void> {
    this.rsjViewSettings.update(viewSetting);
    this.isViewSettingChanged = true;

    await this.rePaginate();
    this.isViewSettingChanged = false;
  }

  public setVerticalLayout(v: boolean): void {
    this.isVertical = v;
  }

  public isVerticalLayout(): boolean {
    return this.isVertical;
  }

  public render(): void {
    return;
  }

  public attatchToHost(host: HTMLElement): void {
    this.host = host;
    this.host.appendChild(this.layoutRoot);
  }

  public containerElement(): HTMLElement {
    return this.layoutRoot;
  }

  public hasMoreAfterEnd(): boolean {
    return this.nextIndexAfterEnd() < this.publication.Spine.length;
  }

  public hasMoreBeforeStart(): boolean {
    return this.nextIndexBeforeStart() >= 0;
  }

  public getLoadedStartPostion(): number {
    return this.loadedContentRange[0];
  }

  public getLoadedEndPosition(): number {
    return this.loadedContentRange[1];
  }

  public isEmpty(): boolean {
    return this.loadedContentRange[0] === this.loadedContentRange[1];
  }

  public loadedRangeLength(): number {
    return this.loadedContentRange[1] - this.loadedContentRange[0];
  }

  public paginatedLength(): number {
    return this.paginatedRange[1] - this.paginatedRange[0];
  }

  public getPaginationInfoAtOffset(offset: number): PaginationInfo[] {
    const res: PaginationInfo[] = [];
    if (offset < this.getLoadedStartPostion() || offset > this.getLoadedEndPosition()) {
      return res;
    }

    for (const siv of this.spineItemViewStatus) {
      if (offset >= siv.offset &&
          offset <= siv.offset + siv.viewSize) {
        res.push({
          spineItemIndex: siv.spineItemIndex,
          spineItemPageCount: siv.view.getTotalPageCount(),
          pageIndex: Math.floor((offset - siv.offset) / this.pageWidth),
          view: siv.view,
          offsetInView: offset - siv.offset,
        });
      }
    }

    return res;
  }

  public async ensureLoaded(): Promise<void> {
    for (const siv of this.spineItemViewStatus) {
      await siv.view.ensureContentLoaded();
    }
  }

  public async ensureConentLoadedAtRange(start: number, end: number): Promise<void> {
    this.removeOutOfRangeSpineItems(start, end);

    // first try to load spine items with known size
    while (end > this.getLoadedEndPosition() && this.hasMoreKnownSizeAfterEnd()) {
      await this.loadNewSpineItemAtEnd();
    }

    while (start < this.getLoadedStartPostion() && this.hasMoreKnowSizeBeforeStart()) {
      await this.loadNewSpineItemAtStart();
    }

    this.updatePaginatedRange();

    if (this.hasUnknownSizeSpineItemLoading) {
      return;
    }

    while (end > this.getLoadedEndPosition() && this.hasMoreAfterEnd()) {
      await this.loadNewSpineItemAtEnd();
    }

    while (start < this.getLoadedStartPostion() && this.hasMoreBeforeStart()) {
      await this.loadNewSpineItemAtStart();
    }

    this.updatePaginatedRange();
  }

  // tslint:disable-next-line:max-line-length
  public async ensureContentLoadedAtSpineItemRange(startIndex: number, endIndex: number): Promise<void> {
    let isEmpty = this.spineItemViewStatus.length === 0;

    if (!isEmpty) {
      if (this.startViewStatus().spineItemIndex > endIndex ||
          this.endViewStatus().spineItemIndex < startIndex) {
        this.clearLoadedContent();
        isEmpty = true;
      }
    }

    if (isEmpty) {
      await this.loadNewSpineItemIndexAtEnd(startIndex);
    }

    const existingStartIndex = this.startViewStatus().spineItemIndex;
    for (let i = existingStartIndex; i < startIndex; i = i - 1) {
      await this.loadNewSpineItemAtStart();
    }

    const existingEndIndex = this.endViewStatus().spineItemIndex;
    for (let i = existingEndIndex; i < endIndex; i = i + 1) {
      await this.loadNewSpineItemAtEnd();
    }
  }

  private clearLoadedContent(): void {
    this.spineItemViewStatus.forEach((v: SpineItemViewStatus) => {
      this.layoutRoot.removeChild(v.viewContainer);
    });

    this.spineItemViewStatus = [];
    this.loadedContentRange = [0, 0];
  }

  private initSpineItemViews(): void {
    this.layoutRoot = document.createElement('div');
    this.layoutRoot.setAttribute('id', 'layout-view-root');
    this.layoutRoot.style.transform = 'translateX(0px)';
    // this.layoutRoot.style.position = 'absolute';
  }

  private startViewStatus(): SpineItemViewStatus {
    return this.spineItemViewStatus[0];
  }

  private endViewStatus(): SpineItemViewStatus {
    return this.spineItemViewStatus[this.spineItemViewStatus.length - 1];
  }

  private nextIndexAfterEnd(): number {
    let nextIndex = 0;
    if (this.spineItemViewStatus.length > 0) {
      nextIndex = this.endViewStatus().spineItemIndex + 1;
    }

    return nextIndex;
  }

  private nextIndexBeforeStart(): number {
    let nextIndex = 0;
    if (this.spineItemViewStatus.length > 0) {
      nextIndex = this.startViewStatus().spineItemIndex - 1;
    }

    return nextIndex;
  }

  private hasMoreKnownSizeAfterEnd(): boolean {
    const nextIndex = this.nextIndexAfterEnd();

    return nextIndex < this.spineItemViewSizes.length && this.spineItemViewSizes[nextIndex] > 0;
  }

  private hasMoreKnowSizeBeforeStart(): boolean {
    const nextIndex = this.nextIndexBeforeStart();

    return nextIndex >= 0 && this.spineItemViewSizes[nextIndex] > 0;
  }

  private async rePaginate(): Promise<void> {
    this.spineItemViewSizes.fill(-1);

    if (this.spineItemViewStatus.length === 0) {
      return;
    }

    let offset = this.startViewStatus().offset;
    this.loadedContentRange[0] = this.paginatedRange[0] = offset;
    for (const vs of this.spineItemViewStatus) {
      if (this.isViewSettingChanged) {
        await vs.view.setViewSettings(this.rsjViewSettings);
      }

      if (this.isPageSizeChanged) {
        vs.viewContainer.style.width = `${this.pageWidth}px`;
        if (!this.isVertical) {
          vs.viewContainer.style.height = `${this.pageHeight}px`;
        }

        vs.view.resize();
      }

      vs.viewSize = vs.view.getTotalSize(this.pageWidth);
      vs.offset = offset;
      vs.viewContainer.style.transform = this.cssTranslateValue(offset);

      offset += vs.viewSize;
      this.spineItemViewSizes[vs.spineItemIndex] = vs.viewSize;
    }

    this.loadedContentRange[1] = this.paginatedRange[1] = offset;

    this.updatePaginatedRange();
  }

  private updatePaginatedRange(): void {
    this.paginatedRange[0] = Math.min(this.paginatedRange[0], this.loadedContentRange[0]);
    this.paginatedRange[1] = Math.max(this.paginatedRange[1], this.loadedContentRange[1]);

    if (this.isVertical) {
      this.layoutRoot.style.height = `${this.paginatedLength()}px`;
    } else {
      this.layoutRoot.style.width = `${this.paginatedLength()}px`;
    }
  }

  private async loadNewSpineItemAtEnd(): Promise<void> {
    let newSpineItemIndex: number;

    if (this.spineItemViewStatus.length === 0) {
      newSpineItemIndex = 0;
    } else {
      newSpineItemIndex = this.endViewStatus().spineItemIndex + 1;
    }

    if (newSpineItemIndex >= this.publication.Spine.length) {
      return;
    }

    await this.loadNewSpineItemIndexAtEnd(newSpineItemIndex);
  }

  private async loadNewSpineItemIndexAtEnd(index: number): Promise<void> {
    const newViewStatus = await this.loadNewSpineItem(index);

    // RTL change
    newViewStatus.offset = this.spineItemViewStatus.length === 0 ?
                           0 : this.spineItemViewStatus[0].offset;
    this.spineItemViewStatus.forEach((vs: SpineItemViewStatus) => {
      newViewStatus.offset += vs.viewSize;
    });

    newViewStatus.viewContainer.style.transform = this.cssTranslateValue(newViewStatus.offset);

    this.addNewViewStatus(newViewStatus);

    this.loadedContentRange[1] = newViewStatus.offset +
                                 newViewStatus.viewSize;
  }

  private async loadNewSpineItemAtStart(): Promise<void> {
    let newSpineItemIndex: number;

    if (this.spineItemViewStatus.length === 0) {
      newSpineItemIndex = 0;
    } else {
      newSpineItemIndex = this.startViewStatus().spineItemIndex - 1;
    }

    if (newSpineItemIndex < 0) {
      return;
    }

    await this.loadNewSpineItemIndexAtStart(newSpineItemIndex);
  }

  private async loadNewSpineItemIndexAtStart(index: number): Promise<void> {
    const newViewStatus = await this.loadNewSpineItem(index);

    // RTL change
    newViewStatus.offset = this.spineItemViewStatus.length === 0 ?
                           0 : this.spineItemViewStatus[0].offset;
    newViewStatus.offset -= newViewStatus.viewSize;

    this.addNewViewStatus(newViewStatus);

    this.loadedContentRange[0] = newViewStatus.offset;

    newViewStatus.viewContainer.style.transform = this.cssTranslateValue(newViewStatus.offset);
  }

  private async loadNewSpineItem(index: number): Promise<SpineItemViewStatus> {
    const spineItemView = new SpineItemView(this.iframeLoader,
                                            this.publication.Spine,
                                            this.rsjPackage.spine,
                                            this.rsjViewSettings,
                                            this.isVertical);
    const spineItemViewContainer = document.createElement('div');
    spineItemViewContainer.setAttribute('id', `spine-item-view-${index}`);
    spineItemViewContainer.style.position = 'absolute';
    spineItemViewContainer.style.width = `${this.pageWidth}px`;
    if (!this.isVertical) {
      spineItemViewContainer.style.height = `${this.pageHeight}px`;
    }
    spineItemView.attatchToHost(spineItemViewContainer);

    // RTL change
    this.layoutRoot.appendChild(spineItemViewContainer);

    let viewLength: number;
    if (this.spineItemViewSizes[index] > 0) {
      viewLength = this.spineItemViewSizes[index];
      spineItemView.loadSpineItem(this.publication.Spine[index]);
    } else {
      this.hasUnknownSizeSpineItemLoading = true;
      await spineItemView.loadSpineItem(this.publication.Spine[index]);
      this.hasUnknownSizeSpineItemLoading = false;

      viewLength = spineItemView.getTotalSize(this.pageWidth);
      this.spineItemViewSizes[index] = viewLength;
    }

    return {
      offset: 0,
      viewContainer: spineItemViewContainer,
      spineItemIndex: index,
      view: spineItemView,
      viewSize: viewLength,
    };
  }

  private cssTranslateValue(offset: number): string {
    return this.isVertical ? `translateY(${offset}px)` : `translateX(${offset}px)`;
  }

  private addNewViewStatus(vs: SpineItemViewStatus): void {
    this.spineItemViewStatus.push(vs);
    this.spineItemViewStatus.sort((a: SpineItemViewStatus, b: SpineItemViewStatus) => {
      return a.offset - b.offset;
    });
  }

  private removeOutOfRangeSpineItems(start: number, end: number): void {
    let newStart: number = this.loadedContentRange[1];
    let newEnd: number = this.loadedContentRange[0];
    let hasAnyRemoved: boolean = false;
    for (const vs of this.spineItemViewStatus) {
      const viewEnd = vs.offset + vs.view.getTotalSize(this.pageWidth);
      if (viewEnd < start || vs.offset > end) {
        vs.view.unloadSpineItem();
        this.layoutRoot.removeChild(vs.viewContainer);
        hasAnyRemoved = true;
      } else {
        if (!newStart || vs.offset < newStart) {
          newStart = vs.offset;
        }
        if (!newEnd || viewEnd > newEnd) {
          newEnd = viewEnd;
        }
      }
    }

    if (hasAnyRemoved) {
      if (newStart >= newEnd) {
        this.loadedContentRange = [0, 0];
      } else {
        this.loadedContentRange = [newStart, newEnd];
      }

      this.spineItemViewStatus = this.spineItemViewStatus.filter((vs: SpineItemViewStatus) => {
        return vs.view.isSpineItemInUse();
      });
    }
  }

}
