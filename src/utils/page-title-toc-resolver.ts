import * as EPUBcfi from 'readium-cfi-js';

import { Publication } from '../streamer/publication';
import { Location } from '../navigator/location';
import { Rendition } from '../navigator/rendition';
import { Link } from '@readium/shared-models/lib/models/publication/link';
import { RenditionContext } from '../navigator';
import { PaginationInfo } from '../navigator/views/layout-view';
import { IContentView } from '../navigator/views/content-view/content-view';

class LinkLocationInfo {
  link: Link;
  cfi?: string;
}

export interface PageBreakData {
  link: Link;
  rect: ClientRect | DOMRect;
  iframeRect: ClientRect | DOMRect;
  offset: {
    x: number,
    y: number,
  };
}

export enum PageBreakVisibility {
  Visible,
  None,
  Publisher,
}

export enum PageBreakLocation {
  isWithinViewport,
  isBeforeViewport,
  isAfterViewport,
}

export class PageTitleTocResolver {
  private pub: Publication;
  private rendition: Rendition;

  private pageListMap: Map<string, LinkLocationInfo[]> = new Map<string, LinkLocationInfo[]>();
  private tocMap: Map<string, LinkLocationInfo[]> = new Map<string, LinkLocationInfo[]>();
  private pageListMapByHref: Map<string, Link[]> = new Map<string, Link[]>();

  public constructor(rendCtx: RenditionContext) {
    this.rendition = rendCtx.rendition;
    this.pub = this.rendition.getPublication();

    if (this.pub.pageList) {
      this.pub.pageList.forEach((link) => {
        const href = link.href.split('#')[0];
        const links = this.pageListMapByHref.get(href) || [];
        links.push(link);
        this.pageListMapByHref.set(href, links);
      });
    }

  }

  public getPageTitleFromLocation(loc: Location): string {
    const href = loc.getHref();
    this.ensureSpineItemPageListMap(href);

    const link = this.findMatchLink(loc, this.pageListMap);
    return link ? link.title : '';
  }

  public getTocLinkFromLocation(loc: Location): Link | null {
    const href = loc.getHref();
    this.ensureSpineItemTocMap(href);

    return this.findMatchLink(loc, this.tocMap);
  }

  public async getVisiblePageBreaks(viewportRect: ClientRect | DOMRect): Promise<PageBreakData[]> {
    return this.getPageBreaks((spineInfo: PaginationInfo) => {
      return this.findVisiblePageBreaksForView(spineInfo, viewportRect);
    });
  }

  public async setPageBreakVisibility(visible: PageBreakVisibility): Promise<void> {
    this.getPageBreaks((spineInfo: PaginationInfo) => {
      this.setAllPageBreaksVisibilityForView(spineInfo, visible);
    });
  }

  private async getPageBreaks(findPageBreakFunc: Function): Promise<PageBreakData[]> {
    const screenBegin = this.rendition.viewport.getStartPosition();
    const screenEnd = this.rendition.viewport.getEndPosition();

    if (!screenBegin || !screenEnd) {
      console.error('screenBegin or screenEnd not obtained');
      return [];
    }

    const indexBegin = screenBegin.spineItemIndex;
    const indexEnd = screenEnd.spineItemIndex;
    const hasMultipleIFrames = (indexBegin !== indexEnd);

    const spineInfo: PaginationInfo[] = [screenBegin];

    if (hasMultipleIFrames) {
      spineInfo.push(screenEnd);
    }

    return this.findVisiblePageBreaksAllViews(spineInfo, findPageBreakFunc);
  }

  private findVisiblePageBreaksAllViews(
    spineInfo: PaginationInfo[],
    findPageBreakFunc: Function,
  ): PageBreakData[] {
    let pageBreaks: PageBreakData[] = [];
    spineInfo.forEach((spineInfo) => {
      const pb = findPageBreakFunc(spineInfo);
      pageBreaks = pageBreaks.concat(pb);
    });

    pageBreaks.sort((a, b) => {
      return a.rect.left - b.rect.left;
    });

    return pageBreaks;
  }

  private findVisiblePageBreaksForView(
    spineInfo: PaginationInfo,
    viewportRect: ClientRect | DOMRect,
  ): PageBreakData[] {
    const contentView = spineInfo.view.getContentView();
    const link = this.pub.readingOrder[spineInfo.spineItemIndex];
    if (!link) {
      console.error('No link returned');
      return [];
    }

    const links = this.pageListMapByHref.get(link.href);
    let pageBreaks: PageBreakData[] = [];
    if (links) {
      const link = this.findAnyVisiblePageBreakIndexInPageList(links, contentView, viewportRect);
      // tslint:disable-next-line
      pageBreaks = link ? this.findVisibleSiblingsInPageList(link, links, contentView, viewportRect) : [];
    }

    return pageBreaks;
  }

  private findAnyVisiblePageBreakIndexInPageList(
    pageList: Link[],
    contentView: IContentView,
    viewportRect: ClientRect | DOMRect,
  ): Link | null | undefined {
    if (pageList.length === 0) {
      return undefined;
    }

    const middleIndex = Math.floor((pageList.length - 1) / 2);
    const href = pageList[middleIndex].href.split('#')[1];
    const element = contentView.getElementById(href);
    const iframeEl = contentView.element().getElementsByTagName('iframe')[0];
    if (!element || !iframeEl) {
      return null;
    }

    const { pageBreakLocation } =
      this.isElementVisibleInViewport(element, iframeEl, viewportRect);

    // A visible pagebreak was found. Check siblings
    if (pageBreakLocation === PageBreakLocation.isWithinViewport) {
      return pageList[middleIndex];
    }
    if (pageBreakLocation === PageBreakLocation.isBeforeViewport) {
      const subset = pageList.slice(middleIndex + 1, pageList.length);
      return this.findAnyVisiblePageBreakIndexInPageList(subset, contentView, viewportRect);
    }
    if (pageBreakLocation === PageBreakLocation.isAfterViewport) {
      const subset = pageList.slice(0, middleIndex);
      return this.findAnyVisiblePageBreakIndexInPageList(subset, contentView, viewportRect);
    }
  }

  // Find visible siblings based on an index that's already been determined
  // to be within the viewport
  private findVisibleSiblingsInPageList(
    startLink: Link,
    pageList: Link[],
    contentView: IContentView,
    viewportRect: ClientRect | DOMRect,
  ): PageBreakData[] {
    const startIndex = pageList.indexOf(startLink);
    const pageBreaks: PageBreakData[] = [];

    // Look at elements that fall at and beyond the start index
    for (let i = startIndex; i < pageList.length; i += 1) {
      this.addToPageBreaks(pageBreaks, pageList, i, contentView, viewportRect);
    }

    // Look at elements that fall before the start index
    for (let i = startIndex - 1; i >= 0; i -= 1) {
      this.addToPageBreaks(pageBreaks, pageList, i, contentView, viewportRect);
    }

    return pageBreaks;
  }

  private addToPageBreaks(
    pageBreaks: PageBreakData[],
    pageList: Link[],
    index: number,
    contentView: IContentView,
    viewportRect: ClientRect | DOMRect,
  ): void {
    const iframeEl = contentView.element().getElementsByTagName('iframe')[0];
    const pl = pageList[index];
    const href = pl ? pageList[index].href.split('#')[1] : '';
    const el = contentView.getElementById(href);
    if (!iframeEl || !el) {
      console.error('iframe or element not found');
      return;
    }
    const iframeRect = iframeEl.getBoundingClientRect();

    const { pageBreakLocation, elementRect } =
      this.isElementVisibleInViewport(el, iframeEl, viewportRect);

    if (pageBreakLocation === PageBreakLocation.isWithinViewport) {
      pageBreaks.push({
        iframeRect,
        link: pageList[index],
        rect: elementRect,
        offset: {
          x: iframeRect.left,
          y: iframeRect.top,
        },
      });
    } else {
      // If this element isn't visible, there shouldn't be any more beyond it
      return;
    }
  }

  private isElementVisibleInViewport(
    element: HTMLElement,
    iframe: HTMLElement,
    viewportRect: ClientRect | DOMRect,
  ): {pageBreakLocation: PageBreakLocation, elementRect: ClientRect | DOMRect} {
    const elStyle = window.getComputedStyle(element);
    // Ensure the element is visible before calculations are made
    let displayChanged = false;
    if (elStyle.display === 'none') {
      element.style.setProperty('display', 'inline');
      displayChanged = true;
    }
    let visiblityChanged = false;
    if (elStyle.visibility === 'hidden') {
      element.style.setProperty('visibility', 'visible');
      visiblityChanged = true;
    }

    const elementRect = element.getBoundingClientRect();
    const iframeRect = iframe.getBoundingClientRect();

    // Doesn't factor in scroll. There may be other factors missing. Add them if necessary.
    const absPosX = elementRect.left + iframeRect.left;
    const absPosY = elementRect.top + iframeRect.top;

    const isBeforeViewport =
      (absPosX + elementRect.width <= viewportRect.left) ||
      (absPosY + elementRect.height <= viewportRect.top);

    const isAfterViewport =
      (absPosX >= viewportRect.left + viewportRect.width) ||
      (absPosY >= viewportRect.top + viewportRect.height);

    const isWithinViewport = !isBeforeViewport && !isAfterViewport;

    // Set the element back to it's original state
    if (displayChanged) {
      element.style.removeProperty('display');
    }
    if (visiblityChanged) {
      element.style.removeProperty('visibility');
    }

    let pageBreakLocation: number = -1;
    if (isWithinViewport) {
      pageBreakLocation = PageBreakLocation.isWithinViewport;
    } else if (isBeforeViewport) {
      pageBreakLocation = PageBreakLocation.isBeforeViewport;
    } else if (isAfterViewport) {
      pageBreakLocation = PageBreakLocation.isAfterViewport;
    }

    return { pageBreakLocation, elementRect };
  }

  private setAllPageBreaksVisibilityForView(
    spineInfo: PaginationInfo,
    visible: PageBreakVisibility,
  ): void {
    const contentView = spineInfo.view.getContentView();
    const pub = this.rendition.getPublication();
    const link = pub.readingOrder[spineInfo.spineItemIndex];
    if (!link) {
      console.error('No link returned');
      return;
    }

    const links = this.pageListMapByHref.get(link.href);
    if (links) {
      links.forEach((link) => {
        const href = link.href.split('#')[1];
        const element = contentView.getElementById(href);
        if (!element) {
          return;
        }

        // TODO: Ideally, I think a class name should be added / removed instead of adding all the
        // styles individually.
        if (visible === PageBreakVisibility.Visible) {
          element.style.setProperty('border', '1px solid rgb(190,190,190)');
          element.style.setProperty('color', 'rgb(190, 190, 190)');
          element.style.setProperty('padding', '0.1rem 0.3rem');
          element.style.setProperty('margin', '0 0.2rem');
          element.style.setProperty('display', 'inline');
        } else if (visible === PageBreakVisibility.None) {
          element.style.setProperty('display', 'none');
        } else {
          element.style.removeProperty('border');
          element.style.removeProperty('color');
          element.style.removeProperty('padding');
          element.style.removeProperty('margin');
          element.style.removeProperty('display');
        }
      });
    }
  }

  private findMatchLink(loc: Location, infoMap: Map<string, LinkLocationInfo[]>): Link | null {
    const pageLocInfo = infoMap.get(loc.getHref());
    if (!pageLocInfo || pageLocInfo.length === 0) {
      return null;
    }

    let matchedLink = pageLocInfo[0].link;
    const locationCfi = loc.getLocation();
    if (locationCfi === '') {
      return matchedLink;
    }

    for (const info of pageLocInfo) {
      if (!info.cfi || info.cfi === '') {
        continue;
      }
      const ret = EPUBcfi.Interpreter.compareCFIs(`epubcfi(/99!${info.cfi})`,
                                                  `epubcfi(/99!${locationCfi})`);
      if (ret[0] <= 0) {
        matchedLink = info.link;
      }
    }

    return matchedLink;
  }

  private ensureSpineItemPageListMap(href: string): void {
    if (this.pageListMap.has(href)) {
      return;
    }

    const pageInfo: LinkLocationInfo[] = [];
    for (const pl of this.pub.pageList) {
      const locInfo = this.tryCreateLinkLocationInfo(pl, href);
      if (locInfo) {
        pageInfo.push(locInfo);
      }
    }

    this.pageListMap.set(href, pageInfo);
  }

  private ensureSpineItemTocMap(href: string): void {
    if (this.tocMap.has(href)) {
      return;
    }

    const tocInfo: LinkLocationInfo[] = [];
    for (const link of this.pub.toc) {
      this.processTocLink(link, href, tocInfo);
    }

    this.tocMap.set(href, tocInfo);
  }

  private processTocLink(link: Link, href: string, tocInfo: LinkLocationInfo[]): void {
    const locInfo = this.tryCreateLinkLocationInfo(link, href);
    if (locInfo) {
      tocInfo.push(locInfo);
    }

    const children = link.children;
    if (!children) {
      return;
    }

    for (const cl of children) {
      this.processTocLink(cl, href, tocInfo);
    }
  }

  private tryCreateLinkLocationInfo(link: Link, href: string): LinkLocationInfo | null {
    if (!link.href) {
      return null;
    }
    const [siHref, elementId] = this.getHrefAndElementId(link.href);
    if (siHref !== href) {
      return null;
    }

    const cfi = this.rendition.getCfiFromAnchor(siHref, elementId);
    if (cfi === undefined) {
      console.warn(`failed to get cfi for ${link.href}`);
    }

    return { link, cfi };
  }

  private getHrefAndElementId(fullHref: string): [string, string] {
    const hrefCompontents = fullHref.split('#');
    const href = hrefCompontents[0];
    const anchor = hrefCompontents.length >= 2 ? hrefCompontents[1] : '';

    return [href, anchor];
  }
}
