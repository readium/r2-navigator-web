import { URL } from 'isomorphic-url-shim';
import { Publication as ReadiumWebPub } from '@readium/shared-models/lib/models/publication/publication';
import { Link } from '@readium/shared-models/lib/models/publication/link';
import { Relation } from '@readium/shared-models/lib/models/publication/interfaces/link-core';

export class Publication extends ReadiumWebPub {
  // Alias for now, refactor later.
  public get spine(): Link[] {
    return this.readingOrder;
  }

  private readonly sourceURI?: string;

  constructor(sourceURI?: string) {
    super();
    this.sourceURI = sourceURI;
  }

  public static fromModel(publication: ReadiumWebPub, sourceURI?: string): Publication {
    return Object.assign(new Publication(sourceURI), publication);
  }

  public static fromJSON(webPubManifestJSON: string, sourceURI?: string): Publication {
    return Publication.fromModel(ReadiumWebPub.parse(webPubManifestJSON), sourceURI);
  }

  public static async fromURL(publicationURL: string): Promise<Publication> {
    if (publicationURL.endsWith('.json')) {
      const webPubManifestJSON = await (await fetch(publicationURL)).text();

      return Publication.fromJSON(webPubManifestJSON, publicationURL);
    }
    throw new Error('NO EPUB PARSING');
    // const epubPublication = <Publication>(await EpubParsePromise(publicationURL));

    // return Publication.fromModel(epubPublication, publicationURL);
  }

  public searchLinkByRel(rel: Relation): Link | undefined {
    if (this.resources) {
      const ll = this.resources.find((link) => {
        return link.rel.has(rel);
      });
      if (ll) {
        return ll;
      }
    }

    if (this.readingOrder) {
      const ll = this.readingOrder.find((link) => {
        return link.rel.has(rel);
      });
      if (ll) {
        return ll;
      }
    }

    if (this.links) {
      const ll = this.links.find((link) => {
        return link.rel.has(rel);
      });
      if (ll) {
        return ll;
      }
    }

    return undefined;
  }

  // Still not happy with this..
  public getBaseURI(): string | undefined {
    let href;
    if (this.sourceURI) {
      href = new URL('./', this.sourceURI).toString();
    } else {
      const selfLink = this.searchLinkByRel('self');
      if (!selfLink) {
        throw new Error('No self link in publication');
      }
      href = selfLink.href;
    }

    return new URL('./', href).toString();
  }

  public getHrefRelativeToManifest(href: string): string {
    const baseUri = this.getBaseURI();
    if (!baseUri) return '';

    const relativeHref = href.split(baseUri)[1];

    return relativeHref || '';
  }

  public findSpineItemIndexByHref(href: string): number {
    return this.readingOrder.findIndex((item: Link) => {
      return item.href === href;
    });
  }

  public isInternalHref(href: string): boolean {
    const baseUri = this.getBaseURI();
    if (!baseUri) {
      console.warn('Could not get baseUri');

      return false;
    }

    return href.includes(baseUri);
  }
}
