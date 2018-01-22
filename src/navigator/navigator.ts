import { Rendition } from './rendition'

export class Navigator {

    private reader: any;

    constructor(rendition: Rendition) {
        this.reader = rendition.reader;
    }

    getScreenCount(): number {
        console.log('getScreenCount called!');
        return 0;
    }

    nextScreen(): Promise<any> {
        this.reader.openPageNext();
        return this.paginationChangedPromise();
    }

    previousScreen(): Promise<any> {
        this.reader.openPagePrev();
        return this.paginationChangedPromise();
    }

    private paginationChangedPromise() {
        return new Promise((resolve: any) => {
            let readium = (<any>window).ReadiumSDK;
            this.reader.once(readium.Events.PAGINATION_CHANGED, () => {
                resolve();
            });
        });
    }
}