import { Publication } from '../../../streamer';
import { PackageDocument } from '../../../streamer/readium-shared-js-impl/package-document';
import { IFrameLoader } from '../../iframe-loader';

import { IContentViewFactory } from './content-view-factory';

import { IContentView } from './content-view';
import { R1MultiPageContentView } from './r1-multi-page-content-view';
import { R1SinglePageContentView } from './r1-single-page-content-view';

// tslint:disable-next-line:no-implicit-dependencies
import { Package as ReadiumPackage, ViewerSettings } from '@evidentpoint/readium-shared-js';

// tslint:disable:no-any

export class R1ContentViewFactory implements IContentViewFactory {
  private rsjPackage: any;
  private rsjPackageDoc: any;
  private rsjViewSettings: any = new ViewerSettings({ syntheticSpread: 'single' });

  private iframeLoader: IFrameLoader;

  public constructor(pub: Publication) {
    this.iframeLoader = new IFrameLoader(pub.getBaseURI());

    this.rsjPackageDoc = new PackageDocument(pub);
    this.rsjPackage = new ReadiumPackage({ ...this.rsjPackageDoc.getSharedJsPackageData() });
    this.rsjPackage.spine.handleLinear(true);
  }

  public createContentView(isFixedLayout: boolean, isVertical: boolean): IContentView {
    if (isFixedLayout || isVertical) {
      return new R1SinglePageContentView(this.iframeLoader,
                                         this.rsjPackage.spine,
                                         this.rsjViewSettings,
                                         isFixedLayout);
    }

    return new R1MultiPageContentView(this.iframeLoader,
                                      this.rsjPackage.spine,
                                      this.rsjViewSettings);
  }

  public viewSettings(): any {
    return this.rsjViewSettings;
  }
}
