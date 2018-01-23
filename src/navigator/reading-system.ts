import { Publication } from '../streamer/publication';
import { Rendition } from './rendition';

export class ReadingSystem {

  private viewport: HTMLElement;

  constructor(config: any) {
  }

  public initRenderer(viewport: HTMLElement) {
    this.viewport = viewport;
  }

  public openRendition(pub: Publication): Rendition {
    const rendition = new Rendition(pub, this.viewport);

    return rendition;
  }
}
