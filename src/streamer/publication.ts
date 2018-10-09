import { URL } from 'isomorphic-url-shim';
import { EPUBPublication } from 'r2-webpub-model-js/lib/extensions/epub/publication';
import { Link } from 'r2-webpub-model-js/lib/models/link';

export class Publication extends EPUBPublication {

  // Alias for now, refactor later.
  public get Spine(): Link[] {
    return this.ReadingOrder;
  }

  private readonly sourceURI?: string;

  constructor(sourceURI?: string) {
    super();
    this.sourceURI = sourceURI;
  }

  public static fromModel(publication: EPUBPublication, sourceURI?: string): Publication {
    return Object.assign(new Publication(sourceURI), publication);
  }

  public static fromJSON(webPubManifestJSON: string, sourceURI?: string): Publication {
    return Publication.fromModel(EPUBPublication.parse(webPubManifestJSON), sourceURI);
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

  public searchLinkByRel(rel: string): Link | undefined {
    if (this.Resources) {
      const ll = this.Resources.find((link) => {
        return link.HasRel(rel);
      });
      if (ll) {
        return ll;
      }
    }

    if (this.ReadingOrder) {
      const ll = this.ReadingOrder.find((link) => {
        return link.HasRel(rel);
      });
      if (ll) {
        return ll;
      }
    }

    if (this.Links) {
      const ll = this.Links.find((link) => {
        return link.HasRel(rel);
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
      href = selfLink.Href;
    }

    return new URL('./', href).toString();
  }

  public findSpineItemIndexByHref(href: string): number {
    return this.ReadingOrder.findIndex((item: Link) => {
      return item.Href === href;
    });
  }
}
