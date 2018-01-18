import { Publication } from '../streamer/publication'
import { Rendition } from './rendition'

export class ReadingSystem {

    private viewport: HTMLElement;

    constructor(config: any) {
    }

    initRenderer(viewport: HTMLElement) {
        this.viewport = viewport;
    }

    openRendition(pub: Publication): Rendition {
        let rendition = new Rendition(pub, this.viewport);
        rendition.open();
        return rendition;
    }
}