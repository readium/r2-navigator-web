import { Publication as PublicationBase } from 'r2-shared-js';
import { Publication } from '../streamer/publication';

export class StreamerClient {
  public openPublicationFromUrl(epubUrl: string): Promise<Publication> {
    return new Promise((resolve) => {
      fetch(epubUrl)
        .then((resp: Response) => {
          return resp.text();
        })
        .then((webpub: string) => {
          const pub = this.openPublicationFromJson(webpub);
          pub.baseUri = epubUrl.substr(0, epubUrl.lastIndexOf('/') + 1);
          resolve(pub);
        });
    });
  }

  public openPublicationFromJson(webpub: string): Publication {
    const basePub = PublicationBase.parse(webpub);

    const pub = new Publication(webpub);
    Object.assign(pub, basePub);

    return pub;
  }
}
