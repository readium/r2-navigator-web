import { Publication } from '../streamer';
import { Location } from './location';
import { Rendition } from './rendition';
import { PaginationInfo } from './views/layout-view';

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

  public async ensureLoaded(): Promise<void> {
    await this.rendition.viewport.ensureLoaded();
  }

  public async getCurrentLocation(): Promise<Location | undefined | null> {
    const pos = this.rendition.viewport.getStartPosition();

    return this.locationFromPagination(pos);
  }

  public async gotoLocation(loc: Location): Promise<void> {
    await this.rendition.viewport.renderAtLocation(loc);
  }

  public getScreenBegin(): Promise<Location | undefined | null> {
    return this.getCurrentLocation();
  }

  public async getScreenEnd(): Promise<Location | undefined | null> {
    const pos = this.rendition.viewport.getEndPosition();

    return this.locationFromPagination(pos);
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

  private async locationFromPagination(pos?: PaginationInfo): Promise<Location | undefined | null> {
    if (!pos) {
      return pos;
    }

    await pos.view.ensureContentLoaded();

    return new Location(pos.view.getCfi(pos.offsetInView, 0),
                        this.pub.Spine[pos.spineItemIndex].Href);
  }
}
