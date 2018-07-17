// tslint:disable-next-line:max-line-length
import { BookmarkData, Globals as Readium, Helpers, Plugins } from '@evidentpoint/readium-shared-js';
import * as EpubCfi from 'readium-cfi-js';

/* tslint:disable:no-any */

export function importReadiumSharedJSDataTypes(): void {
  if (!(<any>window).ReadiumSDK) {
    (<any>window).ReadiumSDK = Readium;
  }

  if (!(<any>window).ReadiumSDKExport) {
    (<any>window).ReadiumSDKExport = {
      BookmarkData, EpubCfi, Plugins, Helpers,
    };
  }
}
