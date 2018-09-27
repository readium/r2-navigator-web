import { IContentViewFactory } from './content-view-factory';

import { IFrameLoader } from '../../iframe-loader';
import { ElementBlacklistedChecker } from '../cfi/element-checker';
import { IContentView } from './content-view';
import { R2MultiPageContentView } from './r2-multi-page-content-view';
import { R2SinglePageContentView } from './r2-single-page-content-view';

export class R2ContentViewFactory implements IContentViewFactory {
  private iframeLoader: IFrameLoader;

  private eleChecker: ElementBlacklistedChecker = new ElementBlacklistedChecker([], [], []);

  public constructor(loader: IFrameLoader) {
    this.iframeLoader = loader;
  }

  public setElementChecker(eleChecker: ElementBlacklistedChecker): void {
    this.eleChecker = eleChecker;
  }

  public createContentView(isFixedLayout: boolean, isVertical: boolean): IContentView {
    if (isFixedLayout || isVertical) {
      const cv = new R2SinglePageContentView(this.iframeLoader, this.eleChecker);
      cv.setLayout(isVertical, isFixedLayout);

      return cv;
    }

    return new R2MultiPageContentView(this.iframeLoader, this.eleChecker);
  }
}
