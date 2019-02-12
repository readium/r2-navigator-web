import * as EPUBcfi from 'readium-cfi-js';

import { Publication } from '../streamer/publication';
import { Location } from '../navigator/location';
import { Rendition } from '../navigator/rendition';
import { Navigator } from '../navigator/navigator';
import { Link } from '@readium/shared-models/lib/models/publication/link';
import { RenditionContext, SpineItemView } from '../navigator';

class LinkLocationInfo {
  link: Link;
  spineItemIndex: number;
  cfi?: string;
  pageIndex?: number;
  offset?: number;
}

export interface PageBreakData {
  isOnLeftSide: boolean;
  link: Link;
  rect: ClientRect | DOMRect;
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
    const locationRanges = await this.getStartEndLocations();
    return this.findVisiblePageBreaksForLocations(locationRanges);
  }

  public updatePageListMap(): void {
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
    const locationRanges = await this.getStartEndLocations();
    this.setAllPageBreaksVisibilityForLocations(locationRanges, visible);
  }

  private async getStartEndLocations(): Promise<any> {
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

    return locations;
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

    // Check in further detail to see if it's on the visible portion of the viewport
    return this.isLinkWithinLocationRange(linkInfo, locationRange, spineItemView);
  }

  private isLinkWithinLocationRange(
    linkInfo: LinkLocationInfo,
    locationRange: LocationRange,
    spineItemView: SpineItemView,
  ): boolean {
    const linkEl = this.getElementFromHref(spineItemView, linkInfo.link.href);
    if (!linkEl) {
      return false;
    }

    let isBeyondStart = false;

    // If there is no start defined, assume this page contains two iframes
    // and as a result the start location is within the viewport.
    if (!locationRange.start) {
      isBeyondStart = true;
    } else {
      const startPos = this.rendition.viewport.getStartPosition();
      if (startPos && linkInfo.offset) {
        isBeyondStart = linkInfo.offset >= startPos.offsetInView;
      }
    }

    let isBeforeEnd = false;
    if (!locationRange.end) {
      isBeforeEnd = true;
    } else {
      const endPos = this.rendition.viewport.getEndPosition();
      if (endPos && linkInfo.offset) {
        isBeforeEnd = linkInfo.offset <= endPos.offsetInView;
      }
    }

    return isBeyondStart && isBeforeEnd;
  }

  private addToPageBreaks(
    pageBreaks: PageBreakData[],
    linkInfo: LinkLocationInfo,
    spineItemView: SpineItemView,
  ): void {
    const el = this.getElementFromHref(spineItemView, linkInfo.link.href);
    if (!el) {
      return;
    }
    const elementRect = this.getElementRect(el);

    // Determine if the pageBreak should sit on the left or right hand side of the viewport
    const numPagesPerSpread = this.rendition.getNumOfPagesPerSpread();
    let isOnLeftSide = false;
    const startPos = this.rendition.viewport.getStartPosition();
    const endPos = this.rendition.viewport.getEndPosition();
    if (numPagesPerSpread === 2 && startPos && endPos) {
      const pageWidth = this.rendition.getPageWidth();
      if (startPos.spineItemIndex !== endPos.spineItemIndex) {
        isOnLeftSide = linkInfo.spineItemIndex === startPos.spineItemIndex;
      } else {
        isOnLeftSide = elementRect.left <= startPos.offsetInView + pageWidth;
      }
    }

    pageBreaks.push({
      isOnLeftSide,
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
    const link = linkInfo.link;
    const element = this.getElementFromHref(spineItemView, link.href);
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
    let offset;
    if (spineItemView) {
      pageIndex = spineItemView.getPageIndexOffsetFromElementId(elementId);
      offset = spineItemView.getOffsetFromElementId(elementId);
    }

    return { link, spineItemIndex, cfi, pageIndex, offset };
  }

  private getHrefAndElementId(fullHref: string): [string, string] {
    const hrefCompontents = fullHref.split('#');
    const href = hrefCompontents[0];
    const anchor = hrefCompontents.length >= 2 ? hrefCompontents[1] : '';

    return [href, anchor];
  }

  private getElementFromHref(view: SpineItemView, href: string): HTMLElement | null {
    const contentView = view.getContentView();
    const [_, elementId] = this.getHrefAndElementId(href);
    return contentView.getElementById(elementId);
  }
}
