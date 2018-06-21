import { Publication } from '../../streamer';
import { PackageDocument } from '../../streamer/readium-shared-js-impl/package-document';
import { IFrameLoader } from '../iframe-loader';
import { SpineItemView } from './spine-item-view';

// tslint:disable-next-line:no-implicit-dependencies
import { Package as ReadiumPackage, ViewerSettings } from '@evidentpoint/readium-shared-js';

export class SpineItemViewFactory {
  public iframeLoader: IFrameLoader;

  private publication: Publication;

  // tslint:disable-next-line:no-any
  private rsjPackage: any;

  // tslint:disable-next-line:no-any
  private rsjViewSettings: any;

  private isFixedLayout: boolean = false;

  private isVertical: boolean = false;

  // tslint:disable-next-line:no-any
  public constructor(pub: Publication, rsjViewSettings: any, isFixedLayout: boolean) {
    this.publication = pub;
    this.rsjViewSettings = rsjViewSettings;
    this.isFixedLayout = isFixedLayout;
    this.iframeLoader = new IFrameLoader(this.publication.getBaseURI());

    const packageDoc = new PackageDocument(this.publication);
    this.rsjPackage = new ReadiumPackage({ ...packageDoc.getSharedJsPackageData() });
    this.rsjPackage.spine.handleLinear(true);
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
    spineItemView.attachToHost(spineItemViewContainer);

    return [spineItemView, spineItemViewContainer];
  }
}
