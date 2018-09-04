import { IContentViewFactory } from './content-view-factory';

import { Publication } from '../../../streamer';
import { IFrameLoader } from '../../iframe-loader';

import { IContentView } from './content-view';
import { R2SinglePageContentView } from './r2-single-page-content-view';

export class R2ContentViewFactory implements IContentViewFactory {

  private iframeLoader: IFrameLoader;

  public constructor(pub: Publication) {
    this.iframeLoader = new IFrameLoader(pub.getBaseURI());
  }

  public createContentView(isFixedLayout: boolean, isVertical: boolean): IContentView {
    if (isFixedLayout || isVertical) {
      return new R2SinglePageContentView(this.iframeLoader);
    }

    return new R2SinglePageContentView(this.iframeLoader);
  }

  // tslint:disable-next-line:no-any
  public viewSettings(): any {
    throw new Error('Method not implemented.');
  }
}
