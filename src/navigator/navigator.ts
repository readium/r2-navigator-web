import { Location } from './location';
import { Rendition } from './rendition';

export class Navigator {

  private reader: any;

  constructor(rendition: Rendition) {
    this.reader = rendition.reader;
  }

  public nextScreen(): Promise<void> {
    this.reader.openPageNext();

    return this.paginationChangedPromise();
  }

  public previousScreen(): Promise<void> {
    this.reader.openPagePrev();

    return this.paginationChangedPromise();
  }

  public getCurrentLocation(): Location | undefined | null {
    const cfi = this.reader.getFirstVisibleCfi();

    return cfi ? new Location(cfi.contentCFI, cfi.idref) : cfi;
  }

  public gotoLocation(loc: Location): Promise<void> {
    this.reader.openSpineItemElementCfi(loc.getHref(), loc.getLocation());

    return this.paginationChangedPromise();
  }

  public getScreenBegin(): Location | undefined | null {
    return this.getCurrentLocation();
  }

  public getScreenEnd(): Location | undefined | null {
    const cfi = this.reader.getLastVisibleCfi();

    return cfi ? new Location(cfi.contentCFI, cfi.idref) : cfi;
  }

  public isFirstScreen(): boolean {
    const info = this.reader.getPaginationInfo();
    const pageInfo = info.openPages[0];

    return pageInfo.spineItemIndex === 0 && pageInfo.spineItemPageIndex === 0;
  }

  public isLastScreen(): boolean {
    const info = this.reader.getPaginationInfo();
    const pageInfo = info.openPages[info.openPages.length - 1];

    return pageInfo.spineItemIndex + 1 === pageInfo.spineItemCount &&
           pageInfo.spineItemPageIndex + 1 === pageInfo.spineItemPageCount;
  }

  public isFirstScreenSpine(): boolean {
    const info = this.reader.getPaginationInfo();
    const pageInfo = info.openPages[0];

    console.log(JSON.stringify(info));

    return pageInfo.spineItemPageIndex === 0;
  }

  public isFinalScreenSpine(): boolean {
    const info = this.reader.getPaginationInfo();
    const pageInfo = info.openPages[info.openPages.length - 1];

    return pageInfo.spineItemPageIndex + 1 === pageInfo.spineItemPageCount;
  }

  public getScreenCountSpine(): number {
    const info = this.reader.getPaginationInfo();
    const pageInfo = info.openPages[0];

    return Math.ceil(pageInfo.spineItemPageCount / info.openPages.length);
  }

  public async gotoScreen(screenIndex: number): Promise<void> {
    this.reader.openPageIndex(screenIndex);

    return this.paginationChangedPromise();
  }

  private paginationChangedPromise(): Promise<void> {
    return new Promise<void>((resolve: any) => {
      const readium = (<any>window).ReadiumSDK;
      this.reader.once(readium.Events.PAGINATION_CHANGED, () => {
        resolve();
      });
    });
  }
}
