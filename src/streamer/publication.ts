import { Publication as PublicationBase, PublicationLink } from 'r2-shared-js';

export class Publication extends PublicationBase {
  public baseUri: string;

  private webpub: string;

  constructor(webpub: string) {
    super();
    this.webpub = webpub;
  }

  public getManifestJSON(): string {
    return this.webpub;
  }

  public findSpineItemIndexByHref(href: string): number {
    return this.Spine.findIndex((item: PublicationLink) => {
      return item.Href === href;
    });
  }
}
