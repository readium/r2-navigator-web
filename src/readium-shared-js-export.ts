// tslint:disable-next-line:max-line-length
import { BookmarkData, Globals, Helpers, Plugins } from '@evidentpoint/readium-shared-js';
import * as EpubCfi from 'readium-cfi-js';

/* tslint:disable:no-any */

export function importReadiumSharedJSDataTypes(): void {
  if (!(<any>window).ReadiumSDK) {
    (<any>window).ReadiumSDK = Globals;
  }

  if (!(<any>window).ReadiumSDKExport) {
    (<any>window).ReadiumSDKExport = {
      BookmarkData, EpubCfi, Plugins, Helpers,
    };
  }
}
