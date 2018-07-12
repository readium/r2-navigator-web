import { BookmarkData, Globals as Readium, Plugins } from '@evidentpoint/readium-shared-js';

/* tslint:disable:no-any */

export function importReadiumSharedJSDataTypes(): void {
  if (!(<any>window).ReadiumSDK) {
    (<any>window).ReadiumSDK = Readium;
  }

  if (!(<any>window).ReadiumSDKExport) {
    (<any>window).ReadiumSDKExport = {
      BookmarkData, Plugins,
    };
  }
}
