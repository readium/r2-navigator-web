import { Link } from '../../epub-model/publication-link';
import { Publication } from '../../streamer/publication';
import { PackageDocument } from '../../streamer/readium-share-js-impl/package-document';
import { IFrameLoader } from '../iframe-loader';
import { SpineItemView } from './spine-item-view';
import { SpineItemViewMock } from './spine-item-view-mock';
import { View } from './view';

// tslint:disable-next-line:no-implicit-dependencies
import { Package as ReadiumPackage } from 'readium-shared-js';

export class PaginationInfo {
  public spineItemIndex: number;
  public spineItemPageCount: number;
  public pageIndex: number;
  public contentCfi: string;
}

class SpineItemViewStatus {
  public view: SpineItemView;
  public viewContainer: HTMLElement;
  public spineItemIndex: number;
  public offset: number;
}

export class LayoutView extends View {
  private spineItemViewStatus: SpineItemViewStatus[] = [];

  private host: HTMLElement;
  private layoutRoot: HTMLElement;

  private publication: Publication;

  // tslint:disable-next-line:no-any
  private rsjPackage: any;

  private iframeLoader: IFrameLoader;

  private loadedContentRange: [number, number] = [0, 0];

  private pageWidth: number = 600;
  private pageHeight: number = 800;

  public constructor(pub: Publication) {
    super();
    this.publication = pub;
    this.iframeLoader = new IFrameLoader(this.publication.baseUri);
    this.initSpineItemViews();

    const packageDoc = new PackageDocument(this.publication);
    this.rsjPackage = new ReadiumPackage({ ...packageDoc.getSharedJsPackageData() });
    this.rsjPackage.spine.handleLinear(true);
  }

  public setPageSize(width: number, height: number): void {
    this.pageWidth = width;
    this.pageHeight = height;
    this.layoutRoot.style.height = `${height}px`;
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
    if (this.spineItemViewStatus.length === 0) {
      return this.publication.Spine.length > 0;
    }

    return this.endViewStatus().spineItemIndex + 1 < this.publication.Spine.length;
  }

  public hasMoreBeforeStart(): boolean {
    if (this.spineItemViewStatus.length === 0) {
      return this.publication.Spine.length > 0;
    }

    return this.startViewStatus().spineItemIndex > 0;
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

  public getPaginationInfoAtOffset(offset: number): PaginationInfo[] {
    const res: PaginationInfo[] = [];
    if (offset < this.getLoadedStartPostion() || offset > this.getLoadedEndPosition()) {
      return res;
    }

    for (const siv of this.spineItemViewStatus) {
      if (offset >= siv.offset &&
          offset <= siv.offset + siv.view.getTotalPageCount() * this.pageWidth) {
        res.push({
          spineItemIndex: siv.spineItemIndex,
          spineItemPageCount: siv.view.getTotalPageCount(),
          pageIndex: Math.floor((offset - siv.offset) / this.pageWidth),
          contentCfi: '',
        });
      }
    }

    return res;
  }

  public async ensureConentLoadedAtRange(start: number, end: number): Promise<void> {
    while (end > this.getLoadedEndPosition() && this.hasMoreAfterEnd()) {
      await this.loadNewSpineItemAtEnd();
    }

    while (start < this.getLoadedStartPostion() && this.hasMoreBeforeStart()) {
      await this.loadNewSpineItemAtStart();
    }

    this.layoutRoot.style.width = `${this.loadedRangeLength()}px`;
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
      newViewStatus.offset += vs.view.getTotalPageCount() * this.pageWidth;
    });

    newViewStatus.viewContainer.style.transform = `translateX(${newViewStatus.offset}px)`;

    this.spineItemViewStatus.push(newViewStatus);

    this.loadedContentRange[1] = newViewStatus.offset +
                                 newViewStatus.view.getTotalPageCount() * this.pageWidth;
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
    newViewStatus.offset -= newViewStatus.view.getTotalPageCount() * this.pageWidth;

    this.spineItemViewStatus.push(newViewStatus);

    this.loadedContentRange[0] = newViewStatus.offset;

    newViewStatus.viewContainer.style.transform = `translateX(${newViewStatus.offset}px)`;
  }

  private async loadNewSpineItem(index: number): Promise<SpineItemViewStatus> {
    const spineItemView = new SpineItemView(this.iframeLoader,
                                            this.publication.Spine,
                                            this.rsjPackage.spine);
    const spineItemViewContainer = document.createElement('div');
    spineItemViewContainer.setAttribute('id', `spine-item-view-${index}`);
    spineItemViewContainer.style.position = 'absolute';
    spineItemViewContainer.style.width = `${this.pageWidth}px`;
    spineItemViewContainer.style.height = `${this.pageHeight}px`;
    spineItemView.attatchToHost(spineItemViewContainer);

    // RTL change
    this.layoutRoot.appendChild(spineItemViewContainer);

    await spineItemView.loadSpineItem(this.publication.Spine[index]);

    return {
      offset: 0,
      viewContainer: spineItemViewContainer,
      spineItemIndex: index,
      view: spineItemView,
    };
  }

}
