import {JSON as TAJSON} from "ta-json";

import {Publication as PublicationBase} from '../epub-model/publication';
import {Publication} from '../streamer/publication';

export class StreamerClient {
    openPublicationFromUrl(epubUrl: string): Promise<Publication> {
        return new Promise((resolve) => {
            fetch(epubUrl).then((resp: Response) => {
                return resp.text();
            }).then((webpub: string) => {
                let pub = this.openPublicationFromJson(webpub);
                pub.baseUri = epubUrl.substr(0, epubUrl.lastIndexOf('/') + 1);
                resolve(pub);
            })
        });
    }

    openPublicationFromJson(webpub: string): Publication {
        let basePub = TAJSON.parse<PublicationBase>(webpub, PublicationBase);
        
        let pub = new Publication(webpub);
        Object.assign(pub, basePub);

        return pub;
    }
}