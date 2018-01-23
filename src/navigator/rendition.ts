import { Publication } from '../streamer/publication';
import { PackageDocument } from '../streamer/readium-share-js-impl/package-document';
import { IFrameLoader } from './iframe-loader';

import readiumSharedJs from 'readium-shared-js';

export class Rendition {

  public reader: any;

  private pub: Publication;
  private viewport: HTMLElement;

  constructor(pub: Publication, viewport: HTMLElement) {
    this.pub = pub;
    this.viewport = viewport;

    this.initReader();
  }

  public getPublication(): Publication {
    return this.pub;
  }

  public render(): Promise<any> {
    const packageDoc = new PackageDocument(this.pub);
    const openBookData = { ...packageDoc.getSharedJsPackageData() };
    this.reader.openBook(openBookData);

    return new Promise((resolve: any) => {
      const readium = (<any>window).ReadiumSDK;
      this.reader.once(readium.Events.PAGINATION_CHANGED, () => {
        resolve();
      });
    });
  }

  private initReader() {
    const readerOptions: any = {};
    readerOptions.el = this.viewport;
    readerOptions.iframeLoader = new IFrameLoader(this.pub.baseUri);
    readerOptions.fonts = {};

    this.reader = new ReaderView(readerOptions);
  }
}
