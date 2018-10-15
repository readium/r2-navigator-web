import { LinkHandling } from 'r2-glue-js';
import { Publication } from '../streamer';
import { Navigator } from './navigator';
import { RenditionContext } from './rendition-context';

export class GlueLinkManager {
  private handlers: LinkHandling[] = [];
  private navigator: Navigator;
  private publication: Publication;

  constructor(renditionContext: RenditionContext) {
    this.navigator = renditionContext.navigator;
    const rendition = renditionContext.rendition;
    this.publication = rendition.getPublication();

    this.destroyHandler = this.destroyHandler.bind(this);
    this.handleLink = this.handleLink.bind(this);
  }

  public createNewHandler(iframe: HTMLIFrameElement): void {
    if (!iframe.contentWindow) return;

    const linkGlue = new LinkHandling(iframe.contentWindow);
    if (!linkGlue) {
      console.warn('LinkHandling was not created');

      return;
    }
    this.handlers.push(linkGlue);

    linkGlue.addEventListener('body', 'click', [], this.handleLink);

    iframe.contentWindow.addEventListener('unload', () => {
      this.destroyHandler(linkGlue);
    });
  }

  private destroyHandler(handler: LinkHandling): void {
    if (!handler) return;

    handler.destroy();
    const index = this.handlers.indexOf(handler);
    this.handlers.splice(index, 1);
  }

  // TODO: Replace 'any' with a more suitable type
  // tslint:disable-next-line:no-any
  private async handleLink(opts: any): Promise<void> {
    const opt = opts[0];
    if (!opt) return;

    this.handleLinkHref(opt.href);
  }

  private async handleLinkHref(href: string): Promise<void> {
    if (this.publication.isInternalHref(href)) {
      let relativeHref = this.publication.getHrefRelativeToManifest(href);

      // check for an element id
      const splitHref = relativeHref.split('#');
      let eleId = '';
      if (splitHref.length > 1) {
        relativeHref = splitHref[0];
        eleId = splitHref[1];
      }

      this.navigator.gotoAnchorLocation(relativeHref, eleId);
    } else { // is external href
      window.open(href);
    }
  }
}
