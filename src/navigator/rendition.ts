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
    }

    getPublication(): Publication {
        return this.pub;
    }

    open() {
        let readerOptions: any = {};
        readerOptions.el = this.viewport;
        readerOptions.iframeLoader = new IFrameLoader(this.pub.baseUri);
        readerOptions.fonts = {};

        let packageDoc = new PackageDocument(this.pub);
        let openBookData = Object.assign({}, packageDoc.getSharedJsPackageData());

        this.reader = new ReaderView(readerOptions);
        this.reader.openBook(openBookData);
    }
}