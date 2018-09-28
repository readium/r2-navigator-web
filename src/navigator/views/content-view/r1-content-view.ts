import { PublicationLink } from '@evidentpoint/r2-shared-js';
import {
  Globals as Readium,
  PaginationChangedEventArgs,
  StyleCollection,
  ViewerSettings,
} from '@evidentpoint/readium-shared-js';

import { IFrameLoader } from '../../iframe-loader';
import { getReadiumEventsRelayInstance } from '../readium-events-relay';
import { CancellationToken, SettingName } from '../types';
import { ViewSettings } from '../view-settings';
import { IContentView } from './content-view';

// tslint:disable:no-any

interface IR1ViewerSettingValueConverter {
  name: string;
  // tslint:disable-next-line:prefer-method-signature
  valueConverter: (val: any) => any;
}

function genericValueConverter(value: any): any {
  return value;
}

export class R1ContentView implements IContentView {
  protected readonly R1_SETTING_MAP: Map<string, IR1ViewerSettingValueConverter> = new Map([
    [SettingName.ColumnGap, { name: 'columnGap', valueConverter: genericValueConverter }],
    [SettingName.FontSize, { name: 'fontSize', valueConverter: genericValueConverter }],
  ]);

  protected iframeLoader: IFrameLoader;

  protected host: HTMLElement;

  protected contentViewImpl: any;

  protected rsjSpine: any;
  protected $iframe: any;
  protected rjsSpineItem: any;

  protected spineItem: PublicationLink;
  protected spineItemIndex: number;
  protected spineItemPgCount: number = 1;

  public constructor(iframeLoader: IFrameLoader, rsjSpine: any) {
    this.iframeLoader = iframeLoader;
    this.rsjSpine = rsjSpine;
  }

  public attachToHost(host: HTMLElement): void {
    this.host = host;
  }
  public render(): void {
    this.contentViewImpl.render();
  }

  public element(): HTMLElement {
    return <HTMLElement>(this.contentViewImpl.element()[0]);
  }

  public metaWidth(): number {
    return 0;
  }

  public metaHeight(): number {
    return 0;
  }

  public calculatedHeight(): number {
    return 0;
  }

  public spineItemPageCount(): number {
    return this.spineItemPgCount;
  }

  public getOffsetFromCfi(cfi: string): number {
    console.warn('R1 view does not support getOffsetFromCfi()');

    return 0;
  }

  public getOffsetFromElementId(cfi: string): number {
    console.warn('R1 view does not support getOffsetFromElementId()');

    return 0;
  }

  public getPageIndexOffsetFromCfi(cfi: string): number {
    return this.contentViewImpl.getPageIndexOffsetFromCfi(cfi);
  }

  public getPageIndexOffsetFromElementId(elementId: string): number {
    return this.contentViewImpl.getNavigator().getPageIndexDeltaForElementId(elementId);
  }

  public getCfi(offsetMain: number, offset2nd: number): string {
    const navLogic = this.contentViewImpl.getNavigator();

    return navLogic.getFirstVisibleCfi({ top: offset2nd, left: -offsetMain });
  }

  public getRangeCfiFromDomRange(range: Range): any {
    return this.contentViewImpl.getRangeCfiFromDomRange(range);
  }

  public getVisibleElements(selector: string, includeSpineItems: boolean): any {
    return this.contentViewImpl.getVisibleElements(selector, includeSpineItems);
  }

  public getElements(selector: string): any {
    return this.contentViewImpl.getElements(this.spineItem.Href, selector);
  }

  public getElementById(id: string): any {
    return this.contentViewImpl.getElementById(this.spineItem.Href, id);
  }

  public isElementVisible($ele: any, offsetMain: number, offset2nd: number): boolean {
    const navLogic = this.contentViewImpl.getNavigator();

    return navLogic.isElementVisible($ele, { top: offset2nd, left: -offsetMain });
  }

  public getNearestCfiFromElement(element: any): any {
    const navLogic = this.contentViewImpl.getNavigator();

    return navLogic.getNearestCfiFromElement(element);
  }

  public getPaginationInfo(): object {
    return {
      paginationInfo: this.contentViewImpl.getPaginationInfo(),
      initiator: this,
      spineItem: this.contentViewImpl.getLoadedSpineItems()[0],
      elementId: undefined,
    };
  }

  public async loadSpineItem(spineItem: PublicationLink, spineItemIndex: number,
                             viewSettings: ViewSettings,
                             token?: CancellationToken): Promise<void> {
    this.spineItem = spineItem;
    this.spineItemIndex = spineItemIndex;

    const readiumViewParams = {
      $viewport: this.host,
      spine: this.rsjSpine,
      userStyles: new StyleCollection(),
      bookStyles: new StyleCollection(),
      iframeLoader: this.iframeLoader,
      expandDocumentFullWidth: true,
    };

    const rsjVs = this.rsjViewerSettings(viewSettings);

    const reader = {
      fonts: {},
      viewerSettings: () => rsjVs,
      needsFixedLayoutScalerWorkAround: () => false,
    };

    return this.loadSpineItemContentViewImpl(readiumViewParams, reader, rsjVs, token);
  }

  public spineItemLoadedPromise(token?: CancellationToken): Promise<void> {
    return this.paginationChangedPromise(token);
  }

  public unloadSpineItem(): void {
    getReadiumEventsRelayInstance().unregisterEvents(this.contentViewImpl);
  }

  public setViewSettings(viewSetting: ViewSettings): void {
    this.contentViewImpl.setViewSettings(this.rsjViewerSettings(viewSetting));

    const pageInfo = this.contentViewImpl.getPaginationInfo().openPages[0];
    this.spineItemPgCount = pageInfo.spineItemPageCount;
  }

  public scale(scale: number): void {
    return;
  }

  public onResize(): void {
    this.contentViewImpl.onViewportResize();

    const pageInfo = this.contentViewImpl.getPaginationInfo().openPages[0];
    this.spineItemPgCount = pageInfo.spineItemPageCount;
  }

  protected loadSpineItemContentViewImpl(params: any, reader: any,
                                         rsjViewerSettings: any,
                                         token?: CancellationToken): Promise<void> {
    // Should be provided in subclass
    return Promise.resolve();
  }

  protected paginationChangedHanlder(
    paras: PaginationChangedEventArgs,
    handler: (paras: PaginationChangedEventArgs) => void,
    resolve: () => void,
    token?: CancellationToken,
  ): void {
    const pageInfo = paras.paginationInfo.openPages[0];
    if (pageInfo.spineItemIndex === this.spineItemIndex) {
      this.contentViewImpl.removeListener(
        Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
        handler,
      );
      this.spineItemPgCount = pageInfo.spineItemPageCount;
      console.log(`spine item ${this.spineItemIndex} loaded: ${this.spineItemPgCount} pages`);
      resolve();
    }
  }

  protected paginationChangedPromise(token?: CancellationToken): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const handler = (paras: PaginationChangedEventArgs) => {
        this.paginationChangedHanlder(paras, handler, resolve, token);
      };
      this.contentViewImpl.on(
        Readium.InternalEvents.CURRENT_VIEW_PAGINATION_CHANGED,
        handler,
      );
    });
  }

  protected rsjViewerSettings(vs: ViewSettings): any {
    const rjs: object = {};
    Object.defineProperty(rjs, 'syntheticSpread', { value: 'single' });

    const settingEntries = vs.getAllSettings();
    for (const setting of settingEntries) {
      const converter = this.R1_SETTING_MAP.get(setting.name);
      if (converter) {
        const r1Name = converter.name;
        const r1Value = converter.valueConverter(setting.value);
        Object.defineProperty(rjs, r1Name, { value:r1Value });
      }
    }

    return new ViewerSettings(rjs);
  }
}
