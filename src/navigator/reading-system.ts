import { Publication } from '../streamer';
import { Rendition } from './rendition';
import { R1ContentViewFactory } from './views/content-view/r1-content-view-factory';

export class ReadingSystem {
  private viewport: HTMLElement;

  public initRenderer(viewport: HTMLElement): void {
    this.viewport = viewport;
  }

  public openRendition(pub: Publication): Rendition {
    return new Rendition(pub, this.viewport, new R1ContentViewFactory(pub));
  }
}
