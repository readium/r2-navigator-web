import { Location } from './location';
import { Rendition } from './rendition';

export class Navigator {

  private reader: any;

  constructor(rendition: Rendition) {
    this.reader = rendition.reader;
  }

  public getScreenCount(): number {
    console.log('getScreenCount called!');

    return 0;
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

  private paginationChangedPromise(): Promise<void> {
    return new Promise<void>((resolve: any) => {
      const readium = (<any>window).ReadiumSDK;
      this.reader.once(readium.Events.PAGINATION_CHANGED, () => {
        resolve();
      });
    });
  }
}
