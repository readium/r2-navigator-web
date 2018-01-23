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

  public nextScreen(): Promise<any> {
    this.reader.openPageNext();

    return this.paginationChangedPromise();
  }

  public previousScreen(): Promise<any> {
    this.reader.openPagePrev();

    return this.paginationChangedPromise();
  }

  private paginationChangedPromise() {
    return new Promise((resolve: any) => {
      const readium = (<any>window).ReadiumSDK;
      this.reader.once(readium.Events.PAGINATION_CHANGED, () => {
        resolve();
      });
    });
  }
}
