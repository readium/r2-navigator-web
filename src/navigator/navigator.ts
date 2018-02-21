import { Publication } from '../streamer/publication';
import { Location } from './location';
import { Rendition } from './rendition';
import { Viewport } from './views/viewport';

export class Navigator {
  private rendition: Rendition;

  private pub: Publication;

  constructor(rendition: Rendition) {
    this.rendition = rendition;
    this.pub = rendition.getPublication();
  }

  public async nextScreen(): Promise<void> {
    await this.rendition.viewport.nextScreen();
  }

  public async previousScreen(): Promise<void> {
    await this.rendition.viewport.prevScreen();
  }

  public getCurrentLocation(): Location | undefined | null {
    const pos = this.rendition.viewport.getStartPosition();

    return pos ? new Location(pos.contentCfi, this.pub.Spine[pos.spineItemIndex].Href) : pos;
  }

  public gotoLocation(loc: Location): Promise<void> {
    // this.reader.openSpineItemElementCfi(loc.getHref(), loc.getLocation());

    // return this.paginationChangedPromise();

    return Promise.resolve();
  }

  public getScreenBegin(): Location | undefined | null {
    return this.getCurrentLocation();
  }

  public getScreenEnd(): Location | undefined | null {
    const pos = this.rendition.viewport.getEndPosition();

    return pos ? new Location(pos.contentCfi, this.pub.Spine[pos.spineItemIndex].Href) : pos;
  }

  public isFirstScreen(): boolean {
    const pos = this.rendition.viewport.getStartPosition();
    if (!pos) {
      return false;
    }

    return pos.spineItemIndex === 0 && pos.pageIndex === 0;
  }

  public isLastScreen(): boolean {
    const pos = this.rendition.viewport.getEndPosition();
    if (!pos) {
      return false;
    }

    return pos.spineItemIndex >= this.pub.Spine.length &&
           pos.pageIndex + 1 === pos.spineItemPageCount;
  }

  public isFirstScreenSpine(): boolean {
    const pos = this.rendition.viewport.getStartPosition();
    if (!pos) {
      return false;
    }

    return pos.pageIndex === 0;
  }

  public isFinalScreenSpine(): boolean {
    const pos = this.rendition.viewport.getEndPosition();
    if (!pos) {
      return false;
    }

    return pos.pageIndex + 1 === pos.spineItemPageCount;
  }

  public getScreenCountSpine(): number {
    // const pos = this.rendition.viewport.getStartPosition();
    // if (!pos) {
    //   return -1;
    // }

    // return pos.spineItemPageCount;
    return -1;
  }

  // public async gotoScreenSpine(screenIndex: number): Promise<void> {
  //   return Promise.resolve();
  // }

  // public getCurrentScreenIndexSpine(): number {
  //   return -1;
  // }
}
