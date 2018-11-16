import * as EPUBcfi from 'readium-cfi-js';

import { Publication } from '../streamer/publication';
import { Location } from '../navigator/location';
import { Rendition } from '../navigator/rendition';
import { EPUBLink } from 'r2-webpub-model-js/lib/extensions/epub/link';
import { Link } from 'r2-webpub-model-js/lib/models/link';

class LinkLocationInfo {
  link: Link;
  cfi?: string;
}

export class PageTitleTocResolver {
  private pub: Publication;
  private rendition: Rendition;

  private pageListMap: Map<string, LinkLocationInfo[]> = new Map<string, LinkLocationInfo[]>();
  private tocMap: Map<string, LinkLocationInfo[]> = new Map<string, LinkLocationInfo[]>();

  public constructor(rend: Rendition) {
    this.rendition = rend;
    this.pub = rend.getPublication();
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
      if (ret >= 0) {
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

    const children = (<EPUBLink>(link)).children;
    if (!children) {
      return;
    }

    for (const cl of children) {
      this.processTocLink(cl, href, tocInfo);
    }
  }

  private tryCreateLinkLocationInfo(link: Link, href: string): LinkLocationInfo | null {
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
