import {Publication as PublicationBase} from '../epub-model/publication'

export class Publication extends PublicationBase {
    private webpub: string;

    public baseUri: string;

    constructor(webpub: string) {
        super();
        this.webpub = webpub;
    }

    getManifestJSON(): string {
        return this.webpub;
    }
}