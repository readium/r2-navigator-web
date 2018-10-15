import { GlueManager } from './glue-manager';
import { IFrameLoader } from './iframe-loader';
import { Navigator } from './navigator';
import { Rendition } from './rendition';
import { NavigationRequestManager } from './request-manager';

export class RenditionContext {
  public requestManager: NavigationRequestManager;
  public rendition: Rendition;
  public navigator: Navigator;
  private iframeLoader: IFrameLoader;
  private glueManager: GlueManager;

  constructor(rendition: Rendition, iframeLoader: IFrameLoader) {
    this.rendition = rendition;
    this.iframeLoader = iframeLoader;
    this.requestManager = new NavigationRequestManager();
    this.navigator = new Navigator(this.rendition, this.requestManager);
    this.glueManager = new GlueManager(this, iframeLoader);
  }
}
