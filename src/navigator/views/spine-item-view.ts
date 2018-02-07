import { Link } from '../../epub-model/publication-link';
import { IFrameLoader } from '../iframe-loader';
import { View } from './view';

// tslint:disable-next-line:no-implicit-dependencies
import { ReflowableView, StyleCollection, ViewerSettings } from 'readium-shared-js';

export class SpineItemPaginationInfo {
  public spineItemPageIndex: number;
}

export class SpineItemView extends View {

  protected host: HTMLElement;

  protected iframeLoader: IFrameLoader;

  protected spine: Link[];
  protected rsjSpine: any;

  protected rsjViewSettings: any = new ViewerSettings({ syntheticSpread: 'single' });

  protected spineItem: Link;
  protected spineItemIndex: number;
  protected spineItemPageCount: number = 0;

  protected isEmpty: boolean = true;

  // tslint:disable-next-line:no-any
  protected contentViewImpl: any;

  public constructor(iframeLoader: IFrameLoader, spine: Link[], rsjSpine: any) {
    super();
    this.iframeLoader = iframeLoader;
    this.spine = spine;
    this.rsjSpine = rsjSpine;
  }

  public loadSpineItem(spineItem: Link): Promise<void> {
    this.spineItemIndex = this.spine.indexOf(spineItem);

    const readiumViewParams = {
      $viewport: this.host,
      spine: this.rsjSpine,
      userStyles: new StyleCollection(),
      bookStyles: new StyleCollection(),
      iframeLoader: this.iframeLoader,
    };
    this.isEmpty = false;

    const reader = {
      fonts: {},
      viewerSettings: () => {return this.rsjViewSettings; },
    };
    this.contentViewImpl = new ReflowableView(readiumViewParams, reader);

    this.contentViewImpl.render();

    this.contentViewImpl.setViewSettings(this.rsjViewSettings, true);

    this.contentViewImpl.openPage({ spineItem: this.rsjSpine.items[this.spineItemIndex] });

    return this.paginationChangedPromise();
  }

  public unloadSpineItem(): void {
    while (this.host.firstChild) {
      this.host.removeChild(this.host.firstChild);
    }
    this.isEmpty = true;
  }

  public hasSpineItemLoaded(): boolean {
    return !this.isEmpty;
  }

  public render(): void {
    this.contentViewImpl.render();
  }

  public attatchToHost(host: HTMLElement): void {
    this.host = host;
  }

  public getTotalPageCount(): number {
    return this.spineItemPageCount;
  }

  private getRSJSpine(): object[] {
    return this.spine.map((pubSpineItem: Link) => {
      return {
        href: pubSpineItem.Href,
        media_type: pubSpineItem.TypeLink,
        // assuming that the order of spine items in webpub indicates that they are linear
        linear: 'yes',

        // R2: these data is lost
        rendition_viewport: undefined,
        idref: pubSpineItem.Href,
        manifest_id: '',
        media_overlay_id: '',
        properties: '',
      };
    });
  }

  private paginationChangedHanlder(paras: any, handler: any, resolve: any):void  {
    const readium = (<any>window).ReadiumSDK;
    const pageInfo = paras.paginationInfo.openPages[0];
    if (pageInfo.spineItemIndex === this.spineItemIndex) {
      this.contentViewImpl.removeListener(readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
                                          handler);
      this.spineItemPageCount = pageInfo.spineItemPageCount;
      console.log(`spine item ${this.spineItemIndex} loaded: ${this.spineItemPageCount} pages`);
      resolve();
    }
  }

  private paginationChangedPromise(): Promise<void> {
    return new Promise<void>((resolve: any) => {
      const readium = (<any>window).ReadiumSDK;
      const handler = (paras: any) => {
        this.paginationChangedHanlder(paras, handler, resolve);
      };
      this.contentViewImpl.on(readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED, handler);
    });
  }
}
