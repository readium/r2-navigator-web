import { Publication } from '../../streamer/publication';
import { PackageDocument } from '../../streamer/readium-share-js-impl/package-document';
import { IFrameLoader } from '../iframe-loader';
import { Location } from '../location';
import { SpineItemView } from './spine-item-view';
import { ZoomOptions } from './types';
import { View } from './view';

// tslint:disable-next-line:no-implicit-dependencies
import { Package as ReadiumPackage, ViewerSettings } from 'readium-shared-js';

export class SpineItemViewFactory {
  private publication: Publication;

  // tslint:disable-next-line:no-any
  private rsjPackage: any;

  // tslint:disable-next-line:no-any
  private rsjViewSettings: any;

  private iframeLoader: IFrameLoader;

  private isFixedLayout: boolean = false;

  private isVertical: boolean = false;

  // tslint:disable-next-line:no-any
  public constructor(pub: Publication, rsjViewSettings: any) {
    this.publication = pub;
    this.rsjViewSettings = rsjViewSettings;
    this.iframeLoader = new IFrameLoader(this.publication.baseUri);

    const packageDoc = new PackageDocument(this.publication);
    this.rsjPackage = new ReadiumPackage({ ...packageDoc.getSharedJsPackageData() });
    this.rsjPackage.spine.handleLinear(true);

    if (this.publication.Metadata.Rendition) {
      this.isFixedLayout = this.publication.Metadata.Rendition.Layout === 'fixed';
    }
  }

  public setVerticalLayout(v: boolean): void {
    this.isVertical = v;
  }

  public createSpineItemView(pageWidth: number, pageHeight: number): [SpineItemView, HTMLElement] {
    const spineItemView = new SpineItemView(this.iframeLoader,
                                            this.publication.Spine,
                                            this.rsjPackage.spine,
                                            this.rsjViewSettings,
                                            this.isVertical,
                                            this.isFixedLayout);
    const spineItemViewContainer = document.createElement('div');
    spineItemViewContainer.style.position = 'absolute';
    spineItemViewContainer.style.width = `${pageWidth}px`;
    if (!this.isVertical) {
      spineItemViewContainer.style.height = `${pageHeight}px`;
    }
    spineItemView.attatchToHost(spineItemViewContainer);

    return [spineItemView, spineItemViewContainer];
  }
}
