import { Publication } from '../streamer/publication';
import { PackageDocument } from '../streamer/readium-share-js-impl/package-document'
import { IFrameLoader } from './iframe-loader';

import ReaderView from 'readium-shared-js';

export class Rendition {
    
    private pub: Publication;

    private viewport: HTMLElement;

    reader: any;

    constructor(pub: Publication, viewport: HTMLElement) {
        this.pub = pub;
        this.viewport = viewport;

        this.initReader();
    }

    getPublication(): Publication {
        return this.pub;
    }

    render(): Promise<any> {
        let packageDoc = new PackageDocument(this.pub);
        let openBookData = Object.assign({}, packageDoc.getSharedJsPackageData());
        this.reader.openBook(openBookData);

        return new Promise((resolve: any) => {
            let readium = (<any>window).ReadiumSDK;
            this.reader.once(readium.Events.PAGINATION_CHANGED, () => {
                resolve();
            });
        });
    }

    private initReader() {
        let readerOptions: any = {};
        readerOptions.el = this.viewport;
        readerOptions.iframeLoader = new IFrameLoader(this.pub.baseUri);
        readerOptions.fonts = {};

        this.reader = new ReaderView(readerOptions);
    }
}