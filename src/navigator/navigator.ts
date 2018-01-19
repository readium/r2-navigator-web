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

    nextScreen() {
        this.reader.openPageNext();
    }

    previousScreen() {
        this.reader.previousScreen();
    }
}