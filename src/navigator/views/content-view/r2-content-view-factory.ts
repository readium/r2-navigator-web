import { IContentViewFactory } from './content-view-factory';

import { Publication } from '../../../streamer';
import { IFrameLoader } from '../../iframe-loader';

import { IContentView } from './content-view';
import { R2MultiPageContentView } from './r2-multi-page-content-view';
import { R2SinglePageContentView } from './r2-single-page-content-view';

export class R2ContentViewFactory implements IContentViewFactory {
  private iframeLoader: IFrameLoader;

  public constructor(loader: IFrameLoader) {
    this.iframeLoader = loader;
  }

  public createContentView(isFixedLayout: boolean, isVertical: boolean): IContentView {
    if (isFixedLayout || isVertical) {
      return new R2SinglePageContentView(this.iframeLoader);
    }

    return new R2MultiPageContentView(this.iframeLoader);
  }
}
