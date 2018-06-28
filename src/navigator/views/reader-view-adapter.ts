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
    // console.log('reader-view-adapter:', eventName);
    getReadiumEventsRelayInstance().on(event, fn, context);
  }

  public off(event: string, fn?: ListenerFn, context?: any, once?: boolean): void {
    getReadiumEventsRelayInstance().off(event, fn, context, once);
  }

  public getLoadedSpineItems(): any {
    return this.rsjPackage.spine.items;
  }

  // tslint:disable-next-line:no-empty
  public handleViewportResize(): void {
  }

  public isCurrentViewFixedLayout(): boolean {
    return false;
  }

  public getLoadedContentFrames(): object[] {
    const ret = [];
    const iframes = this.viewRoot.querySelectorAll('iframe');
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < iframes.length; i = i + 1) {
      const iframe = iframes[i];
      const viewDiv = this.getParentElement(iframe, 3);
      const sIndex = this.getSpineItemIndexFromId(viewDiv);
      ret.push({ spineItem: this.rsjPackage.spine.items[sIndex],  $iframe: $(iframes[i]) });
    }

    return ret;
  }

  public getCurrentViewType(): number {
    return 1;
  }

  public addIFrameEventListener(eventName: string, callback: any, context: any): void {
    this.iframeEventManager.addIFrameEventListener(eventName, callback, context);
  }

  // tslint:disable-next-line:no-empty
  public updateIFrameEvents(): void {
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

  // tslint:disable-next-line:no-empty
  public bookmarkCurrentPage(): void {
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

class IframeEventManager {

  private iframeEvents: Map<string, object[]> = new Map();

  public addIFrameEventListener(eventName: string, callback: any, context: any): void {
    if (!this.iframeEvents.has(eventName)) {
      this.iframeEvents.set(eventName, []);
    }

    const handlers = this.iframeEvents.get(eventName);
    if (handlers) {
      handlers.push({ callback, context });
    }
  }

  // tslint:disable-next-line:no-empty
  public updateIFrameEvents(): void {
  }

  // private updateIframeEventsInternal(iframe: HTMLIFrameElement): void {
  //   this.iframeEvents.forEach(((eventHandlers, eventName) => {
  //     eventHandlers.forEach(handler => {
  //     });
  //   }));
  // }

  // private bindIframeEvent(iframe: HTMLIFrameElement, eventName: string, handler: object) {
  //   if (!iframe.contentWindow) {
  //     return;
  //   }
  // }

  // private addNativeEvent(win: Window, eventName: string, handler: object) {
  //   // win.addEventListener(eventName, handler.callback, handler.context);
  // }
}
