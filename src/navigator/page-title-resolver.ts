import * as EPUBcfi from '@evidentpoint/readium-cfi-js';

import { Publication } from '../streamer/publication';
import { Location } from './location';
import { Rendition } from './rendition';

class PaginationInfo {
  originLocation: string;
  pageTitle: string;
  cfi?: string;
}

export class PageTitleResolver {
  private pub: Publication;
  private rendition: Rendition;

  private pageMap: Map<string, PaginationInfo[]> = new Map<string, PaginationInfo[]>();

  public constructor(rend: Rendition) {
    this.rendition = rend;
    this.pub = rend.getPublication();
  }

  public getPageTitleFromLocation(loc: Location): string {
    const href = loc.getHref();
    this.ensureSpineItemPageMap(href);
    const pageInfo = this.pageMap.get(href);
    if (!pageInfo || pageInfo.length === 0) {
      return '';
    }

    let pageTile = pageInfo[0].pageTitle;
    const locationCfi = loc.getLocation();
    if (locationCfi === '') {
      return pageTile;
    }

    for (const info of pageInfo) {
      if (!info.cfi || info.cfi === '') {
        continue;
      }
      const ret = EPUBcfi.Interpreter.compareCFIs(`epubcfi(/99!${info.cfi})`,
                                                  `epubcfi(/99!${locationCfi})`);
      if (ret >= 0) {
        pageTile = info.pageTitle;
      }
    }

    return pageTile;
  }

  private ensureSpineItemPageMap(href: string): void {
    if (this.pageMap.has(href)) {
      return;
    }

    const pageInfo: PaginationInfo[] = [];
    for (const pl of this.pub.pageList) {
      const [siHref, elementId] = this.getHrefAndElementId(pl.href);
      if (siHref !== href) {
        continue;
      }

      const cfi = this.rendition.getCfiFromAnchor(siHref, elementId);
      if (cfi === undefined) {
        console.warn(`failed to get cfi for ${pl.href}`);
      }

      pageInfo.push({ cfi, originLocation: elementId, pageTitle: pl.title });
    }

    this.pageMap.set(href, pageInfo);
  }

  private getHrefAndElementId(fullHref: string): [string, string] {
    const hrefCompontents = fullHref.split('#');
    const href = hrefCompontents[0];
    const anchor = hrefCompontents.length >= 2 ? hrefCompontents[1] : '';

    return [href, anchor];
  }
}
