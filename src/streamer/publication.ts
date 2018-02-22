import { Publication as PublicationBase } from 'r2-shared-js';

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
}
