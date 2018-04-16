import { URL } from 'isomorphic-url-shim';
import {
  EpubParsePromise,
  Publication as PublicationModel,
  PublicationLink,
} from 'r2-shared-js';

export class Publication extends PublicationModel {
  private sourceURI?: string;

  constructor(sourceURI?: string) {
    super();
    this.sourceURI = sourceURI;
  }

  public static fromModel(publication: PublicationModel, sourceURI?: string): Publication {
    return Object.assign(new Publication(sourceURI), publication);
  }

  public static fromJSON(webPubManifestJSON: string): Publication {
    return Publication.fromModel(PublicationModel.parse(webPubManifestJSON));
  }

  public static async fromURL(publicationURL: string): Promise<Publication> {
    if (publicationURL.endsWith('.json')) {
      const webPubManifestJSON = await (await fetch(publicationURL)).text();
      const webPublication = Publication.fromJSON(webPubManifestJSON);

      return Publication.fromModel(webPublication, publicationURL);
    }

    const epubPublication = (await EpubParsePromise(publicationURL)) as Publication;

    return Publication.fromModel(epubPublication, publicationURL);
  }

  public getBaseURI(): string | undefined {
    const selfLink = this.searchLinkByRel('self');
    if (selfLink) {
      return selfLink.Href;
    }

    return this.sourceURI;
  }

  public findSpineItemIndexByHref(href: string): number {
    return this.Spine.findIndex((item: PublicationLink) => {
      return item.Href === href;
    });
  }
}
