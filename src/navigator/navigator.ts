import { Publication } from '../streamer';
import { Location } from './location';
import { Rendition } from './rendition';
import { NavigationRequestManager } from './request-manager';
import { PaginationInfo } from './views/layout-view';

export class Navigator {
  private rendition: Rendition;

  private pub: Publication;

  private requestManager: NavigationRequestManager;

  constructor(rendition: Rendition, requestManager?: NavigationRequestManager) {
    this.rendition = rendition;
    this.pub = rendition.getPublication();
    this.requestManager = requestManager ? requestManager : new NavigationRequestManager();
  }

  public async nextScreen(): Promise<void> {
    await this.requestManager.executeNavigationAction(async (token) => {
      await this.rendition.viewport.nextScreen(token);
    });
  }

  public async previousScreen(): Promise<void> {
    await this.requestManager.executeNavigationAction(async (token) => {
      await this.rendition.viewport.prevScreen(token);
    });
  }

  public async nextSpineItem(): Promise<void> {
    await this.requestManager.executeNavigationAction(async (token) => {
      await this.rendition.viewport.nextSpineItem(token);
    });
  }

  public async previousSpineItem(): Promise<void> {
    await this.requestManager.executeNavigationAction(async (token) => {
      await this.rendition.viewport.prevSpineItem(token);
    });
  }

  public async ensureLoaded(): Promise<void> {
    await this.rendition.viewport.ensureLoaded();
  }

  public async getCurrentLocationAsync(): Promise<Location | undefined | null> {
    return await this.getScreenBeginAsync();
  }

  public getCurrentLocation(): Location | undefined | null {
    return this.getScreenBegin();
  }

  public async gotoBegin(): Promise<void> {
    await this.requestManager.executeNavigationAction(async (token) => {
      await this.rendition.viewport.renderAtSpineItem(0, token);
    });
  }

  public async gotoLocation(loc: Location): Promise<void> {
    await this.requestManager.executeNavigationAction(async (token) => {
      await this.rendition.viewport.renderAtLocation(loc, token);
    });
  }

  public async gotoAnchorLocation(href: string, eleId?: string): Promise<void> {
    await this.requestManager.executeNavigationAction(async (token) => {
      await this.rendition.viewport.renderAtAnchorLocation(href, eleId, token);
    });
  }

  public async getScreenBeginAsync(): Promise<Location | undefined | null> {
    const pos = this.rendition.viewport.getStartPosition();
    if (!pos) {
      return pos;
    }

    return this.locationFromPaginationAsync(pos, false);
  }

  public getScreenBegin(): Location | undefined | null {
    const pos = this.rendition.viewport.getStartPosition();
    if (!pos) {
      return pos;
    }

    return this.locationFromPagination(pos, false);
  }

  public async getScreenEndAsync(): Promise<Location | undefined | null> {
    const pos = this.rendition.viewport.getEndPosition();
    if (!pos) {
      return pos;
    }

    return this.locationFromPaginationAsync(pos, true);
  }

  public getScreenEnd(): Location | undefined | null {
    const pos = this.rendition.viewport.getEndPosition();
    if (!pos) {
      return pos;
    }

    return this.locationFromPagination(pos, true);
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

    return (
      pos.spineItemIndex + 1 >= this.pub.spine.length && pos.pageIndex + 1 >= pos.spineItemPageCount
    );
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
    const pos = this.rendition.viewport.getStartPosition();
    if (!pos) {
      return -1;
    }

    return pos.spineItemPageCount;
  }

  // public async gotoScreenSpine(screenIndex: number): Promise<void> {
  //   return Promise.resolve();
  // }

  // public getCurrentScreenIndexSpine(): number {
  //   return -1;
  // }

  private async locationFromPaginationAsync(
    pos: PaginationInfo,
    backward: boolean,
  ): Promise<Location> {
    await pos.view.ensureContentLoaded();

    return this.createLocation(pos, backward);
  }

  private locationFromPagination(pos: PaginationInfo, backward: boolean): Location {
    return this.createLocation(pos, backward);
  }

  private createLocation(pos: PaginationInfo, backward: boolean): Location {
    const cfi = pos.view.getCfi(pos.offsetInView, 0, backward);
    const type = pos.view.getSpineItem().type;
    const href = this.pub.spine[pos.spineItemIndex].href;
    const fragments = pos.view.getFragments(cfi);

    return new Location(cfi, type, href, fragments);
  }
}
