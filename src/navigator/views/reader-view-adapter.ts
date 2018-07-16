// tslint:disable-next-line:import-name
import $ from 'jquery';
import { Location } from '../location';
import { Navigator } from '../navigator';
import { Rendition } from '../rendition';
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

  public updateSettings(settings: object): void {
    this.rendition.updateViewSettings(settings);
  }

  public getDefaultViewScale(): number {
    return 1;
  }

  public getViewScale(): number {
    return 1;
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

  public getElements(): any {
    return [];
  }

  public isVisibleSpineItemElementCfi(): boolean {
    return false;
  }

  public getRangeCfiFromDomRange(range: object): any {
    return undefined;
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

  // tslint:disable-next-line:no-empty
  public openSpineItemElementCfi(idref: string, elementCfi: string, initiator: any): void {
    this.navigator.gotoLocation(new Location(elementCfi, idref));
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
