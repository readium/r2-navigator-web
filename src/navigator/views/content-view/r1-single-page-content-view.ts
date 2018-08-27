import { IFrameLoader } from '../../iframe-loader';
import { R1ContentView } from './r1-content-view';

import {
  Globals as Readium,
  OnePageView,
} from '@evidentpoint/readium-shared-js';
import { getReadiumEventsRelayInstance } from '../readium-events-relay';
import { CancellationToken } from '../types';

 // tslint:disable:no-any

export class R1SinglePageContentView extends R1ContentView {
  protected isFixedLayout: boolean;

  public constructor(iframeLoader: IFrameLoader, rsjSpine: any, rsjViewSetting: any,
                     isFixedLayout: boolean) {
    super(iframeLoader, rsjSpine, rsjViewSetting);
    this.isFixedLayout = isFixedLayout;
  }

  public metaWidth(): number {
    return this.contentViewImpl.meta_width();
  }

  public metaHeight(): number {
    return this.contentViewImpl.meta_height();
  }

  public calculatedHeight(): number {
    return this.contentViewImpl.getCalculatedPageHeight();
  }

  public scale(scale: number): void {
    if (!this.isFixedLayout) {
      return;
    }

    this.contentViewImpl.transformContentImmediate(scale, 0, 0);
  }

  protected loadSpineItemContentViewImpl(params: any, reader: any,
                                         token?: CancellationToken): Promise<void> {
    this.contentViewImpl = new OnePageView(params,
                                           ['content-doc-frame'],
                                           !this.isFixedLayout,
                                           reader);

    getReadiumEventsRelayInstance().registerEvents(this.contentViewImpl);

    this.contentViewImpl.render();

    this.contentViewImpl.setViewSettings(this.rsjViewSettings, true);

    this.host.appendChild(this.element());

    const spItem = this.rsjSpine.items[this.spineItemIndex];
    this.contentViewImpl.emit(Readium.Events.CONTENT_DOCUMENT_LOAD_START,
                              this.contentViewImpl.get$Iframe(), spItem);

    this.contentViewImpl.loadSpineItem(
      spItem,
      (success: boolean, $iframe: any, spineItem: any) => {
        if (success) {
          if (!token || !token.isCancelled) {
            this.contentViewImpl.emit(Readium.Events.CONTENT_DOCUMENT_LOADED, $iframe, spineItem);
            this.onSpineItemOnePageViewLoaded();
            this.$iframe = $iframe;
            this.rjsSpineItem = spineItem;
          }
          this.emitOnepageViewPaginationChangeEvent(spineItem);
        }
      },
    );

    return this.paginationChangedPromise(token);
  }

  private emitOnepageViewPaginationChangeEvent(spineItem: any): void {
    this.contentViewImpl.emit(Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED, {
      spineItem,
      paginationInfo: { openPages: [{
        spineItemPageIndex: 0,
        spineItemPageCount: 1,
        idref: '',
        spineItemIndex: this.spineItemIndex,
      }] },
      initiator: this,
    });
  }

  private onSpineItemOnePageViewLoaded(): void {
    this.spineItemPgCount = 1;
    this.contentViewImpl.resizeIFrameToContent();
  }
}
