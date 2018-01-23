import { Publication } from '../streamer/publication';
import { Rendition } from './rendition';

export class ReadingSystem {

  private viewport: HTMLElement;

  public initRenderer(viewport: HTMLElement): void {
    this.viewport = viewport;
  }

  public openRendition(pub: Publication): Rendition {
    return new Rendition(pub, this.viewport);
  }
}
