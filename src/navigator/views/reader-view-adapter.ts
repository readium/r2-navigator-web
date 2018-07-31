// tslint:disable-next-line:import-name
import $ from 'jquery';
import { Location } from '../location';
import { Navigator } from '../navigator';
import { Rendition, SpreadMode } from '../rendition';
import { getReadiumEventsRelayInstance } from './readium-events-relay';

/* tslint:disable:no-any */

type ListenerFn = (...args: any[]) => void;

export class ReadiumReaderViewAdapter {
  private rsjPackageDoc: any;
  private rsjPackage: any;

  private navigator: any;

  private rendition: Rendition;

  private viewRoot: HTMLElement;

  private iframeEventManager: IframeEventManager = new IframeEventManager();

  public constructor(rsjPackageDoc: any, rsjPackage: any,
                     navigator: Navigator, viewRoot: HTMLElement, rendition: Rendition) {
    this.rsjPackageDoc = rsjPackageDoc;
    this.rsjPackage = rsjPackage;
    this.navigator = navigator;
    this.viewRoot = viewRoot;
    this.rendition = rendition;
  }

  public getReadiumPackageDocument(): any {
    return this.rsjPackageDoc;
  }

  public getReadiumPackage(): any {
    return this.rsjPackage;
  }

  // tslint:disable-next-line:no-reserved-keywords
  public package(): any {
    return this.rsjPackage;
  }

  public spine(): any {
    return this.rsjPackage.spine;
  }

  public on(event: string, fn: ListenerFn, context?: any): void {
    getReadiumEventsRelayInstance().on(event, fn, context);
  }

  public off(event: string, fn?: ListenerFn, context?: any, once?: boolean): void {
    getReadiumEventsRelayInstance().off(event, fn, context, once);
  }

  public once(event: string, fn: ListenerFn, context?: any): void {
    getReadiumEventsRelayInstance().once(event, fn, context);
  }

  public getLoadedSpineItems(): any[] {
    const itemRange = this.rendition.viewport.visibleSpineItemIndexRange();
    const ret: any[] = [];
    if (itemRange.length === 0) {
      return ret;
    }

    for (let i = itemRange[0]; i <= itemRange[1]; i = i + 1) {
      ret.push(this.rsjPackage.spine.items[i]);
    }

    return ret;
  }

  // tslint:disable-next-line:no-empty
  public handleViewportResize(): void {
  }

  public isCurrentViewFixedLayout(): boolean {
    if (this.rendition.getPublication().Metadata.Rendition) {
      return this.rendition.getPublication().Metadata.Rendition.Layout === 'fixed';
    }

    return false;
  }

  public getLoadedContentFrames(): object[] {
    const itemRange = this.rendition.viewport.visibleSpineItemIndexRange();
    const ret: object[] = [];
    if (itemRange.length === 0) {
      return ret;
    }

    const iframes = this.viewRoot.querySelectorAll('iframe');
    const iframeMap = new Map<number, HTMLElement>();
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < iframes.length; i = i + 1) {
      const iframe = iframes[i];
      const viewDiv = this.getParentElement(iframe, 3);
      const sIndex = this.getSpineItemIndexFromId(viewDiv);
      iframeMap.set(sIndex, iframes[i]);
    }

    for (let i = itemRange[0]; i <= itemRange[1]; i = i + 1) {
      const iframe = iframeMap.get(i);
      if (iframe) {
        ret.push({ spineItem: this.rsjPackage.spine.items[i],  $iframe: $(iframe) });
      }
    }

    return ret;
  }

  public getCurrentViewType(): number {
    return 1;
  }

  public addIFrameEventListener(eventName: string, callback: any,
                                context: any, opts: object): void {
    this.iframeEventManager.addIFrameEventListener(eventName, callback, context, opts);
  }

  public updateIFrameEvents(): void {
    const iframes = this.viewRoot.querySelectorAll('iframe');
    this.iframeEventManager.updateIFrameEvents(Array.prototype.slice.call(iframes));
  }

  public getRenderedSythenticSpread(): string {
    return '';
  }

  public async updateSettings(settings: any): Promise<void> {
    const loc = await this.navigator.getCurrentLocationAsync();

    this.rendition.viewport.beginViewUpdate();

    if (settings.hasOwnProperty('syntheticSpread')) {
      const spreadSetting = settings.syntheticSpread;
      let spreadMode = SpreadMode.FitViewportAuto;
      if (spreadSetting === 'auto') {
        spreadMode = SpreadMode.FitViewportAuto;
      } else if (spreadSetting === 'single') {
        spreadMode = SpreadMode.FitViewportSingleSpread;
      } else if (spreadSetting === 'double') {
        spreadMode = SpreadMode.FitViewportDoubleSpread;
      }

      this.rendition.setPageLayout({ spreadMode });

      delete settings.syntheticSpread;
    }

    await this.rendition.updateViewSettings(settings);

    await this.rendition.viewport.endViewUpdate();

    if (loc) {
      await this.rendition.viewport.renderAtLocation(loc);
    }
  }

  public viewerSettings(): any {
    return this.rendition.viewSettings();
  }

  public getDefaultViewScale(): number {
    return 1;
  }

  public getViewScale(): number {
    return 100;
  }

  // tslint:disable-next-line:no-empty
  public setZoom(): void {
  }

  public getStartCfi(): string {
    return '';
  }

  public getEndCfi(): string {
    return '';
  }

  public getFirstVisibleCfi(): object | undefined {
    const loc = this.navigator.getScreenBegin();
    if (!loc) {
      return undefined;
    }

    return { idref: loc.getHref(), contentCFI: loc.getLocation() };
  }

  public getLastVisibleCfi(): object | undefined {
    const loc = this.navigator.getScreenEnd();
    if (!loc) {
      return undefined;
    }

    return { idref: loc.getHref(), contentCFI: loc.getLocation() };
  }

  public getElements(idref: string, selector: string): any {
    const siIndex = this.rendition.getPublication().findSpineItemIndexByHref(idref);
    if (siIndex < 0) {
      return undefined;
    }

    return this.rendition.viewport.getElements(siIndex, selector);
  }

  public isElementVisible(ele: HTMLElement): boolean {
    const spineItemIndex = this.findSpineItemIndexFromDocument(ele.ownerDocument);
    if (spineItemIndex < 0) {
      return false;
    }

    return this.rendition.viewport.isElementVisible(spineItemIndex, $(ele));
  }

  public isVisibleSpineItemElementCfi(): boolean {
    return false;
  }

  public getRangeCfiFromDomRange(range: Range): any {
    const spineItemIndex = this.findSpineItemIndexFromDocument(range.startContainer.ownerDocument);
    if (spineItemIndex < 0) {
      return undefined;
    }

    return this.rendition.viewport.getRangeCfiFromDomRange(spineItemIndex, range);
  }

  public getVisibleElements(selector: string): any[] {
    const itemRange = this.rendition.viewport.visibleSpineItemIndexRange();
    const ret: any[] = [];
    if (itemRange.length === 0) {
      return ret;
    }

    for (let i = itemRange[0]; i <= itemRange[1]; i = i + 1) {
      const eles = this.rendition.viewport.getVisibleElements(i, selector);
      ret.push(...eles);
    }

    return ret;
  }

  public bookmarkCurrentPage(): string | null {
    const bookmark = this.getFirstVisibleCfi();

    return bookmark ? JSON.stringify(bookmark) : null;
  }

  public getPaginationInfo(): any {
    return {
      canGoLeft: () => { return true; },
      canGoRight: () => { return true; },
    };
  }

  public openPageRight(): void {
    this.navigator.nextScreen();
  }

  public openPageLeft(): void {
    this.navigator.previousScreen();
  }

  public openSpineItemElementCfi(idref: string, elementCfi: string, initiator: any): void {
    this.navigator.gotoLocation(new Location(elementCfi, idref));
  }

  public openSpineItemPage(idref: string, pageIndex?: number, initiator?: any): void {
    if (pageIndex !== undefined) {
      console.warn('openSpineItemPage: page index is ignored');
    }
    this.navigator.gotoLocation(new Location('', idref));
  }

  public openContentUrl(contentUrl: string): void {
    const hashIndex = contentUrl.indexOf('#');
    let hrefPart;
    let elementId;
    if (hashIndex >= 0) {
      hrefPart = contentUrl.substr(0, hashIndex);
      elementId = contentUrl.substr(hashIndex + 1);
    } else {
      hrefPart = contentUrl;
      elementId = '';
    }

    this.navigator.gotoAnchorLocation(hrefPart, elementId);
  }

  public pauseMediaOverlay():void {
    return;
  }

  public resetMediaOverlay():void {
    return;
  }

  private findSpineItemIndexFromDocument(doc: Document): number {
    let spineItemIndex = -1;
    const iframes = this.viewRoot.querySelectorAll('iframe');
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < iframes.length; i = i + 1) {
      const iframe = iframes[i];
      if (doc === iframe.contentDocument) {
        const viewDiv = this.getParentElement(iframe, 3);
        spineItemIndex = this.getSpineItemIndexFromId(viewDiv);
      }
    }

    return spineItemIndex;
  }

  private getParentElement(node: HTMLElement, level: number): HTMLElement {
    let n = node;
    let count = 1;
    while (n.parentElement && count <= level) {
      n = n.parentElement;
      count = count + 1;
    }

    return n;
  }

  private getSpineItemIndexFromId(node: HTMLElement): number {
    const components = node.id.split('-');

    return parseInt(components[components.length - 1], 10);
  }
}

interface IframeEventHandler {
  callback: any;
  context: any;
  opts: any;
}

class IframeEventManager {

  private iframeEvents: Map<string, IframeEventHandler[]> = new Map();

  public addIFrameEventListener(eventName: string, callback: any,
                                context: any, opts: object): void {
    if (!this.iframeEvents.has(eventName)) {
      this.iframeEvents.set(eventName, []);
    }

    const handlers = this.iframeEvents.get(eventName);
    if (handlers) {
      handlers.push({ callback, context, opts });
    }
  }

  public updateIFrameEvents(iframes: HTMLIFrameElement[]): void {
    iframes.forEach(iframe => this.updateIframeEventsInternal(iframe));
  }

  private updateIframeEventsInternal(iframe: HTMLIFrameElement): void {
    this.iframeEvents.forEach(((eventHandlers, eventName) => {
      eventHandlers.forEach((handler: IframeEventHandler) => {
        this.bindIframeEvent(iframe, eventName, handler);
      });
    }));
  }

  private bindIframeEvent(iframe: HTMLIFrameElement,
                          eventName: string,
                          handler: IframeEventHandler): void {
    if (!iframe.contentWindow) {
      return;
    }

    if (handler.opts) {
      if (handler.opts.onWindow) {
        if (handler.opts.jqueryEvent) {
          this.addJqueryEvent($(iframe.contentWindow), eventName, handler);
        } else {
          this.addNativeEvent(iframe.contentWindow, eventName, handler);
        }
      } else if (handler.opts.onDocument) {
        if (handler.opts.jqueryEvent) {
          this.addJqueryEvent($(iframe.contentWindow.document), eventName, handler);
        } else {
          this.addNativeEvent(iframe.contentWindow.document, eventName, handler);
        }
      }
    } else {
      this.addNativeEvent(iframe.contentWindow, eventName, handler);
    }
  }

  private addNativeEvent(target: Window | Document,
                         eventName: string,
                         handler: IframeEventHandler): void {
    target.addEventListener(eventName, handler.callback, handler.context);
  }

  private addJqueryEvent(target: any, eventName: string, handler: IframeEventHandler): void {
    target.on(eventName, handler.callback, handler.context);
  }
}
