import { R1ContentView } from './r1-content-view';

import {
  Globals as Readium,
  ReflowableView,
} from '@evidentpoint/readium-shared-js';
import { getReadiumEventsRelayInstance } from '../readium-events-relay';
import { CancellationToken } from '../types';

 // tslint:disable:no-any

export class R1MultiPageContentView extends R1ContentView {
  protected loadSpineItemContentViewImpl(params: any, reader: any,
                                         token?: CancellationToken): Promise<void> {
    this.contentViewImpl = new ReflowableView(params, reader);

    this.handleDocumentContentLoaded();

    getReadiumEventsRelayInstance().registerEvents(this.contentViewImpl);

    this.contentViewImpl.render();

    this.contentViewImpl.setViewSettings(this.rsjViewSettings, true);

    this.contentViewImpl.openPage({ spineItem: this.rsjSpine.items[this.spineItemIndex] });

    return this.paginationChangedPromise(token);
  }

  private handleDocumentContentLoaded(): void {
    this.contentViewImpl.on(Readium.Events.CONTENT_DOCUMENT_LOADED,
                            ($iframe: any, spineItem: any) => {
                              this.$iframe = $iframe;
                              this.rjsSpineItem = spineItem;
                            });
  }

}
