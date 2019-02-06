import * as EPUBcfi from 'readium-cfi-js';

import { Publication } from '../streamer/publication';
import { Location } from '../navigator/location';
import { Rendition } from '../navigator/rendition';
import { Navigator } from '../navigator/navigator';
import { Link } from '@readium/shared-models/lib/models/publication/link';
import { RenditionContext, SpineItemView } from '../navigator';
import { PaginationInfo } from '../navigator/views/layout-view';
import { IContentView } from '../navigator/views/content-view/content-view';

class LinkLocationInfo {
  link: Link;
  spineItemIndex: number;
  cfi?: string;
  pageIndex?: number;
}

export interface PageBreakData {
  isOnLeftSide: boolean;
  link: Link;
  rect: ClientRect | DOMRect;
  iframeRect: ClientRect | DOMRect;
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

//    Start and end must both be from the same spine item
interface LocationRange {
  start?: Location;
  end?: Location;
}

export class PageTitleTocResolver {
  private pub: Publication;
  private rendition: Rendition;
  private navigator: Navigator;

  private pageListMap: Map<string, LinkLocationInfo[]> = new Map<string, LinkLocationInfo[]>();
  private tocMap: Map<string, LinkLocationInfo[]> = new Map<string, LinkLocationInfo[]>();

  public constructor(rendCtx: RenditionContext) {
    this.rendition = rendCtx.rendition;
    this.navigator = rendCtx.navigator;
    this.pub = this.rendition.getPublication();

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

  public async getVisiblePageBreaks(): Promise<PageBreakData[]> {
    return this.getStartEndLocations((locationRange: LocationRange[]) => {
      return this.findVisiblePageBreaksForLocations(locationRange);
    });
  }

  public async updatePageListMap(): Promise<void> {
    const startLoc = this.navigator.getScreenBegin();
    const endLoc = this.navigator.getScreenEnd();
    if (!startLoc || !endLoc || !this.pub.pageList) {
      return;
    }
    const startHref = startLoc.getHref();
    const endHref = endLoc.getHref();
    this.ensureSpineItemPageListMap(startHref, true);

    if (startHref !== endHref) {
      this.ensureSpineItemPageListMap(endHref, true);
    }
  }

  public async setPageBreakVisibility(visible: PageBreakVisibility): Promise<void> {
    this.getStartEndLocations((locationRanges: LocationRange[]) => {
      this.setAllPageBreaksVisibilityForLocations(locationRanges, visible);
    });
  }

  private async getStartEndLocations(func: Function): Promise<PageBreakData[]> {
    const screenBegin = await this.navigator.getScreenBeginAsync();
    const screenEnd = await this.navigator.getScreenEndAsync();

    if (!screenBegin || !screenEnd) {
      console.error('screenBegin or screenEnd not obtained');
      return [];
    }

    const hasMultipleIFrames = (screenBegin.getHref() !== screenEnd.getHref());
    const locations: LocationRange[] = [];

    if (hasMultipleIFrames) {
      locations.push({
        start: screenBegin,
      });
      locations.push({
        end: screenEnd,
      });
    } else {
      locations.push({
        start: screenBegin,
        end: screenEnd,
      });
    }

    return func(locations);
  }

  private findVisiblePageBreaksForLocations(
    locations: LocationRange[],
  ): PageBreakData[] {
    let pageBreaks: PageBreakData[] = [];
    locations.forEach((locationRange) => {
      const pb = this.findVisiblePageBreaks(locationRange);
      pageBreaks = pageBreaks.concat(pb);
    });

    pageBreaks.sort((a, b) => {
      return a.rect.left - b.rect.left;
    });

    return pageBreaks;
  }

  private findVisiblePageBreaks(
    locationRange: LocationRange,
  ): PageBreakData[] {
    if (!locationRange.start && !locationRange.end) {
      console.log('invalid locationRange given');
      return [];
    }

    const href = this.getHrefFromLocationRange(locationRange);

    const linkInfos = this.pageListMap.get(href);
    const pageBreaks: PageBreakData[] = [];
    const spineItemIndex = this.pub.findSpineItemIndexByHref(href);
    const spineItemView = this.rendition.viewport.getSpineItemView(spineItemIndex);
    if (linkInfos && spineItemView) {
      linkInfos.forEach((linkInfo) => {
        const withinViewport = this.isLinkWithinViewport(linkInfo, locationRange, spineItemView);
        if (withinViewport && spineItemView) {
          this.addToPageBreaks(pageBreaks, linkInfo, spineItemView);
        }
      });
    }

    return pageBreaks;
  }

  private getHrefFromLocationRange(locationRange: LocationRange): string {
    let href = '';
    if (locationRange.start) {
      href = locationRange.start.getHref();
    }
    if (locationRange.end) {
      href = locationRange.end.getHref();
    }

    return href;
  }

  private isLinkWithinViewport(
    linkInfo: LinkLocationInfo,
    locationRange: LocationRange,
    spineItemView: SpineItemView,
  ): boolean {
    if ((!linkInfo.pageIndex && linkInfo.pageIndex !== 0)) {
      return false;
    }

    // Check if link shares the same pageIndex as the locationRange
    const startCfi = locationRange.start && locationRange.start.getLocation();
    const endCfi = locationRange.end && locationRange.end.getLocation();
    const startPageIndex = startCfi ? spineItemView.getPageIndexOffsetFromCfi(startCfi) : -1;
    const endPageIndex = endCfi ? spineItemView.getPageIndexOffsetFromCfi(endCfi) : -1;
    const hasSamePageIndex = linkInfo.pageIndex >= startPageIndex
      || linkInfo.pageIndex <= endPageIndex;

    if (!hasSamePageIndex) {
      return false;
    }

    // Check in further detail to see if it's on the visible portion of the viewport
    return this.isLinkWithinLocationRange(linkInfo, locationRange);
  }

  private isLinkWithinLocationRange(
    linkInfo: LinkLocationInfo,
    locationRange: LocationRange,
  ): boolean {
    if (!linkInfo.cfi) {
      return false;
    }
    let isBeyondStart = false;

    // If there is no start defined, assume this page contains two iframes
    // and as a result the start location is within the viewport.
    if (!locationRange.start) {
      isBeyondStart = true;
    } else {
      const compareCfi = EPUBcfi.Interpreter.compareCFIs(
        `epubcfi(/99!${linkInfo.cfi})`,
        `epubcfi(/99!${locationRange.start.getLocation()})`,
      );
      if (compareCfi[0] >= 0) {
        isBeyondStart = true;
      }
    }

    let isBeforeEnd = false;
    if (!locationRange.end) {
      isBeforeEnd = true;
    } else {
      const compareCfi = EPUBcfi.Interpreter.compareCFIs(
        `epubcfi(/99!${linkInfo.cfi})`,
        `epubcfi(/99!${locationRange.end.getLocation()})`,
      );
      if (compareCfi[0] <= 0) {
        isBeforeEnd = true;
      }
    }

    return isBeyondStart && isBeforeEnd;
  }

  private addToPageBreaks(
    pageBreaks: PageBreakData[],
    linkInfo: LinkLocationInfo,
    spineItemView: SpineItemView,
  ): void {
    const contentView = spineItemView.getContentView();
    const iframe = contentView.element().getElementsByTagName('iframe')[0];
    const [href, elementId] = this.getHrefAndElementId(linkInfo.link.href);
    const el = contentView.getElementById(elementId);
    if (!el || !iframe) {
      return;
    }
    const elementRect = this.getElementRect(el);
    const iframeRect = iframe.getBoundingClientRect();

    // Determine if the pageBreak should sit on the left or right hand side of the viewport
    const numPagesPerSpread = this.rendition.getNumOfPagesPerSpread();
    let isOnLeftSide = false;
    if (numPagesPerSpread === 2) {
      const absPosX = elementRect.left + iframeRect.left;
      const halfWidth = this.rendition.viewport.getViewportSize() / 2;
      isOnLeftSide = absPosX <= halfWidth;
    }

    pageBreaks.push({
      isOnLeftSide,
      iframeRect,
      link: linkInfo.link,
      rect: elementRect,
    });
  }

  private getElementRect(
    element: HTMLElement,
  ): ClientRect | DOMRect {
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

    // Set the element back to it's original state
    if (displayChanged) {
      element.style.removeProperty('display');
    }
    if (visiblityChanged) {
      element.style.removeProperty('visibility');
    }

    return elementRect;
  }

  private setAllPageBreaksVisibilityForLocations(
    locationRanges: LocationRange[],
    visible: PageBreakVisibility,
  ): void {
    locationRanges.forEach((locationRange) => {
      if (!locationRange.start && !locationRange.end) {
        console.log('invalid locationRange given');
        return;
      }

      const href = this.getHrefFromLocationRange(locationRange);
      const linkInfos = this.pageListMap.get(href);
      const spineItemIndex = this.pub.findSpineItemIndexByHref(href);
      const spineItemView = this.rendition.viewport.getSpineItemView(spineItemIndex);
      if (linkInfos && spineItemView) {
        linkInfos.forEach((linkInfo) => {
          this.setPageBreakVisibilityForLinkInfo(linkInfo, visible, spineItemView);
        });
      }
    });
  }

  private setPageBreakVisibilityForLinkInfo(
    linkInfo: LinkLocationInfo,
    visible: PageBreakVisibility,
    spineItemView: SpineItemView,
  ): void {
    const contentView = spineItemView.getContentView();
    const link = linkInfo.link;
    const [href, elementId] = this.getHrefAndElementId(link.href);
    const element = contentView.getElementById(elementId);
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

  private ensureSpineItemPageListMap(href: string, recalculateData?: boolean): void {
    if (this.pageListMap.has(href) && !recalculateData) {
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

    const spineItemIndex = this.pub.findSpineItemIndexByHref(href);
    const spineItemView = this.rendition.viewport.getSpineItemView(spineItemIndex);
    let pageIndex;
    if (spineItemView) {
      pageIndex = spineItemView.getPageIndexOffsetFromElementId(elementId);
    }

    return { link, spineItemIndex, cfi, pageIndex };
  }

  private getHrefAndElementId(fullHref: string): [string, string] {
    const hrefCompontents = fullHref.split('#');
    const href = hrefCompontents[0];
    const anchor = hrefCompontents.length >= 2 ? hrefCompontents[1] : '';

    return [href, anchor];
  }
}
