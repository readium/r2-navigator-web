import { GlueLinkManager } from './glue-link-manager';
import { IFrameLoader } from './iframe-loader';
import { RenditionContext } from './rendition-context';

export class GlueManager {
  private iframeLoader: IFrameLoader;
  private glueLinkManager: GlueLinkManager;

  constructor(context: RenditionContext, iframeLoader: IFrameLoader) {
    this.iframeLoader = iframeLoader;
    this.glueLinkManager = new GlueLinkManager(context);
    this.initializeGlueListeners = this.initializeGlueListeners.bind(this);

    this.iframeLoader.addIFrameLoadedListener(this.initializeGlueListeners);
  }

  private initializeGlueListeners(iframe: HTMLIFrameElement): void {
    this.glueLinkManager.createNewHandler(iframe);
  }
}
