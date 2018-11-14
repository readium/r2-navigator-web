import { Publication } from '../streamer';
import { Rendition } from './rendition';
import { R2ContentViewFactory } from './views/content-view/r2-content-view-factory';
import { IFrameLoader } from './iframe-loader';

export class ReadingSystem {
  private viewport: HTMLElement;

  public initRenderer(viewport: HTMLElement): void {
    this.viewport = viewport;
  }

  public openRendition(pub: Publication): Rendition {
    const loader = new IFrameLoader(pub.getBaseURI());
    return new Rendition(pub, this.viewport, new R2ContentViewFactory(loader));
  }
}
