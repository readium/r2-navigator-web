import { Globals as Readium } from '@evidentpoint/readium-shared-js';
import { EventEmitter } from 'eventemitter3';

/* tslint:disable:no-any */

export class ReaidumEventsRelay extends EventEmitter {

  public registerEvents(contentViewImpl: any): void {
    contentViewImpl.on(Readium.Events.CONTENT_DOCUMENT_LOAD_START, onContentDocumentLoadStart);
    contentViewImpl.on(Readium.Events.CONTENT_DOCUMENT_LOADED, onContentDocumentLoaded);

    contentViewImpl.on(Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
                       onCurrentViewPaginationChanged);
  }

  public unregisterEvents(contentViewImpl: any): void {
    contentViewImpl.off(Readium.Events.CONTENT_DOCUMENT_LOAD_START, onContentDocumentLoadStart);
    contentViewImpl.off(Readium.Events.CONTENT_DOCUMENT_LOADED, onContentDocumentLoaded);

    contentViewImpl.off(Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
                        onCurrentViewPaginationChanged);
  }
}

const relayInstance = new ReaidumEventsRelay();

function onContentDocumentLoadStart($iframe: any, spineItem: any): void {
  relayInstance.emit(Readium.Events.CONTENT_DOCUMENT_LOAD_START, $iframe, spineItem);
}

function onContentDocumentLoaded($iframe: any, spineItem: any): void {
  relayInstance.emit(Readium.Events.CONTENT_DOCUMENT_LOADED, $iframe, spineItem);
}

function onCurrentViewPaginationChanged(pageChangeData: any): void {
  relayInstance.emit(Readium.Events.PAGINATION_CHANGED, pageChangeData);
}

export function getReaidumEventsRelayInstance(): ReaidumEventsRelay {
  return relayInstance;
}
