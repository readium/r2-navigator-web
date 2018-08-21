import { Globals as RsjGlobals, Helpers } from '@evidentpoint/readium-shared-js';
// tslint:disable-next-line:import-name
import $ from 'jquery';
import { Location } from '../navigator/location';
import { Navigator } from '../navigator/navigator';
import { Rendition, SpreadMode } from '../navigator/rendition';
import { NavigationRequestManager } from '../navigator/request-manager';
import { getReadiumEventsRelayInstance } from '../navigator/views/readium-events-relay';
import { ZoomOptions } from '../navigator/views/types';
import { Publication } from '../streamer/publication';

/* tslint:disable:no-any */

type ListenerFn = (...args: any[]) => void;

enum ViewType {
  VIEW_TYPE_COLUMNIZED = 1,
  VIEW_TYPE_FIXED = 2,
  VIEW_TYPE_SCROLLED_DOC = 3,
  VIEW_TYPE_SCROLLED_CONTINUOUS = 4,
}

interface IZoomOption {
  style: string;
  scale: number;
}

export class ReadiumReaderViewAdapter {
  private rsjPackageDoc: any;
  private rsjPackage: any;

  private publication: Publication;
  private navigator: Navigator;
  private rendition: Rendition;

  private viewRoot: HTMLElement;
  private epubContainer: HTMLElement;

  private viewportSize: number;
  private viewportSize2nd: number;

  private resizer: ViewportResizer;

  private iframeEventManager: IframeEventManager = new IframeEventManager();

  private requestManager: NavigationRequestManager = new NavigationRequestManager();

  public constructor(viewRoot: HTMLElement, epubContainer: HTMLElement) {
    this.viewRoot = viewRoot;
    this.epubContainer = epubContainer;

    this.viewportSize = this.epubContainer.clientWidth;
    this.viewportSize2nd = this.epubContainer.clientHeight;
  }

  public async openPublication(pubUrl: string): Promise<void> {
    this.viewRoot.style.width = `${this.viewportSize}px'`;
    this.viewRoot.style.height = `${this.viewportSize2nd}px`;

    this.publication = await Publication.fromURL(pubUrl);
    this.rendition = new Rendition(this.publication, this.viewRoot);
    this.rendition.setViewAsVertical(false);

    this.rendition.viewport.setViewportSize(this.viewportSize, this.viewportSize2nd);
    this.rendition.setPageLayout({ spreadMode: SpreadMode.FitViewportAuto });
    this.rendition.viewport.setPrefetchSize(Math.ceil(this.viewportSize * 0.1));

    this.rendition.render();
    this.rendition.viewport.enableScroll(false);

    this.navigator = new Navigator(this.rendition, this.requestManager);

    this.rsjPackageDoc = this.rendition.getReadiumPackageDocument();
    this.rsjPackage = this.rendition.getReadiumPackage();

    this.resizer = new ViewportResizer(this.epubContainer, this.rendition, this.navigator);
  }

  public async openPage(): Promise<void> {
    await this.requestManager.executeNavigationAction(
      async (token) => {
        await this.rendition.viewport.renderAtOffset(0, token);
      },
    );
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
    return this.getCurrentViewType() === ViewType.VIEW_TYPE_FIXED;
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

  public getCurrentViewType(): ViewType {
    const pub = this.rendition.getPublication();
    let layout = ViewType.VIEW_TYPE_COLUMNIZED;
    if (pub.Metadata.Rendition && pub.Metadata.Rendition.Layout === 'fixed') {
      layout = ViewType.VIEW_TYPE_FIXED;
    }

    return layout;
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

    this.rendition.updateViewSettings(settings);

    this.rendition.viewport.endViewUpdate();

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
    const itemRang = this.rendition.viewport.visibleSpineItemIndexRange();
    if (itemRang.length === 0) {
      return this.getDefaultViewScale() * 100;
    }

    return this.rendition.viewport.getViewScale(itemRang[0]) * 100;
  }

  // tslint:disable-next-line:no-empty
  public async setZoom(options: IZoomOption): Promise<void> {
    if (!this.isCurrentViewFixedLayout()) {
      return;
    }

    this.epubContainer.style.overflow = 'auto';

    const loc = this.navigator.getCurrentLocation();

    if (options.style === 'user') {
      const oldScale = this.getViewScale() / 100;
      const bookviewScale = this.rendition.getZoomScale();
      const transformaedBookviewScale = bookviewScale * options.scale / oldScale;
      this.rendition.setZoom(this.rendition.getZoomOption(), transformaedBookviewScale);
    } else if (options.style === 'fit-screen') {
      this.rendition.setZoom(ZoomOptions.FitByPage, 1);
    } else if (options.style === 'fit-width') {
      this.rendition.setZoom(ZoomOptions.FitByWidth, 1);
    }

    if (loc) {
      await this.rendition.viewport.renderAtLocation(loc);
    }
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

  public getElementById(idref: string, id: string): any {
    const siIndex = this.rendition.getPublication().findSpineItemIndexByHref(idref);
    if (siIndex < 0) {
      return undefined;
    }

    return this.rendition.viewport.getElementById(siIndex, id);
  }

  public isElementVisible(ele: HTMLElement): boolean {
    const spineItemIndex = this.findSpineItemIndexFromDocument(ele.ownerDocument);
    if (spineItemIndex < 0) {
      return false;
    }

    return this.rendition.viewport.isElementVisible(spineItemIndex, $(ele));
  }

  public getNearestCfiFromElement(ele: HTMLElement): any {
    const spineItemIndex = this.findSpineItemIndexFromDocument(ele.ownerDocument);
    if (spineItemIndex < 0) {
      return false;
    }

    return this.rendition.viewport.getNearestCfiFromElement(spineItemIndex, ele);
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

  public resolveContentUrl(contentRefUrl: string, sourceFileHref: string): object | boolean {
    const combinedPath = Helpers.ResolveContentRef(contentRefUrl, sourceFileHref);

    const hashIndex = combinedPath.indexOf('#');
    let hrefPart;
    let elementId;
    if (hashIndex >= 0) {
      hrefPart = combinedPath.substr(0, hashIndex);
      elementId = combinedPath.substr(hashIndex + 1);
    } else {
      hrefPart = combinedPath;
      elementId = undefined;
    }

    let spineItem = this.rsjPackage.spine.getItemByHref(hrefPart);
    if (!spineItem) {
      console.warn(`spineItem ${hrefPart} not found`);
      // sometimes that happens because spine item's URI gets encoded,
      // yet it's compared with raw strings by `getItemByHref()` -
      // so we try to search with decoded link as well
      const decodedHrefPart = decodeURIComponent(hrefPart);
      spineItem = this.rsjPackage.spine.getItemByHref(decodedHrefPart);
      if (!spineItem) {
        console.warn(`decoded spineItem ${decodedHrefPart} missing as well`);

        return false;
      }
    }

    return { elementId, href: hrefPart, idref: spineItem.idref };
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

class ViewportResizer {
  private viewRoot: HTMLElement;
  private rendition: Rendition;
  private navigator: Navigator;

  private location: Location | null | undefined;

  public constructor(viewRoot: HTMLElement, rendi: Rendition, nav: Navigator) {
    this.viewRoot = viewRoot;
    this.rendition = rendi;
    this.navigator = nav;

    this.registerResizeHandler();
  }

  private registerResizeHandler(): void {
    const lazyResize = Helpers.extendedThrottle(
      this.handleViewportResizeStart.bind(this),
      this.handleViewportResizeTick.bind(this),
      this.handleViewportResizeEnd.bind(this), 250, 1000, self);

    $(window).on('resize.ReadiumSDK.readerView', lazyResize);
  }

  private handleViewportResizeStart(): void {
    this.location = this.navigator.getCurrentLocation();
  }

  private handleViewportResizeTick(): void {
    // this.resize();
  }

  private async handleViewportResizeEnd(): Promise<void> {
    this.resize();

    if (this.location) {
      await this.rendition.viewport.renderAtLocation(this.location);
    }
  }

  private resize(): void {
    const newWidth = this.viewRoot.clientWidth;
    const newHeight = this.viewRoot.clientHeight;

    this.rendition.viewport.setViewportSize(newWidth, newHeight);
    this.rendition.refreshPageLayout();
  }
}

interface IframeEventHandler {
  callback: any;
  context: any;
  opts: any;
}

class IframeEventManager {

  private iframeEvents: Map<string, IframeEventHandler[]> = new Map();

  public constructor() {
    getReadiumEventsRelayInstance().on(RsjGlobals.Events.CONTENT_DOCUMENT_LOADED,
                                       ($iframe: any) => {
                                         this.updateIframeEventsInternal($iframe[0]);
                                       });
  }

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
