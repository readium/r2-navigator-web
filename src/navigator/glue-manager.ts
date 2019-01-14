import { Client, Highlighting, LinkHandling, SelectionHandling } from 'r2-glue-js';
import { Publication } from '../streamer';
import { IFrameLoader } from './iframe-loader';
import { Navigator } from './navigator';
import { RenditionContext } from './rendition-context';

type GlueModule = Client;
type IHandlersMap = IFrameIDToGlueMap;
interface IFrameIDToGlueMap { [iFrameID: number]: GlueModule[]; }

export class GlueManager {
  private iframeLoader: IFrameLoader;
  private handlers: GlueModule[] = [];
  private navigator: Navigator;
  private publication: Publication;
  private frameIDToGlueMap: IFrameIDToGlueMap = {};
  private frameID: number = 0;

  constructor(context: RenditionContext, iframeLoader: IFrameLoader) {
    this.iframeLoader = iframeLoader;
    this.initializeGlueModules = this.initializeGlueModules.bind(this);
    this.destroyHandler = this.destroyHandler.bind(this);
    this.handleLink = this.handleLink.bind(this);
    this.handleSelection = this.handleSelection.bind(this);

    this.iframeLoader.addIFrameLoadedListener(this.initializeGlueModules);
    this.navigator = context.navigator;
    const rendition = context.rendition;
    this.publication = rendition.getPublication();
  }

  private initializeGlueModules(iframe: HTMLIFrameElement): void {
    const win = iframe.contentWindow;
    if (!win) {
      console.error('Content window not found');

      return;
    }
    this.frameID += 1;

    this.addGlueHandler(win, new LinkHandling(win), (glue: LinkHandling) => {
      glue.addEventListener('body', 'click', [], this.handleLink);
    });
  }

  private addGlueHandler(win: Window, glue: GlueModule, glueMethod?: Function):
  GlueModule | undefined {
    if (!glue) {
      console.warn('GlueModule was not created');

      return;
    }

    this.handlers.push(glue);
    this.addToHandlersMap(this.frameIDToGlueMap, this.frameID, glue);

    if (glueMethod) {
      glueMethod(glue);
    }

    win.addEventListener('unload', () => {
      this.destroyHandler(glue);
    });

    return glue;
  }

  private addToHandlersMap(map: IHandlersMap, id: number, handler: GlueModule): void {
    if (map[id] === undefined) {
      map[id] = [];
    }

    const handlers = map[id];
    handlers.push(handler);
  }

  private destroyHandler(handler: GlueModule): void {
    if (!handler) {
      return;
    }

    handler.destroy();
    const index = this.handlers.indexOf(handler);
    this.handlers.splice(index, 1);
  }

  // TODO: See if there's a solution that avoids the use of 'any'
  // Also on line 113.
  // tslint:disable-next-line:no-any
  private async handleLink(opts: any): Promise<void> {
    const opt = opts[0];

    await this.handleLinkHref(opt.href);
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

      await this.navigator.gotoAnchorLocation(relativeHref, eleId);
    } else { // is external href
      window.open(href);
    }
  }

  // tslint:disable-next-line:no-any
  private async handleSelection(opts: any): Promise<void> {
    const opt = opts[0];
    const rangeData = opt.rangeData;
    const glue = opts[1];
    const frameID = this.getFrameID(glue);
    const highlighting = this.getGlueModule<Highlighting>('Highlighting', frameID);

    if (highlighting) {
      await highlighting.createHighlight(rangeData);
    }
  }

  private getGlueModule<T extends Client>(moduleType: string, frameID: number): T | undefined {
    const glueModules = this.frameIDToGlueMap[frameID];

    let glue;
    let foundGlue;
    for (glue of glueModules) {
      if (glue.typeName && glue.typeName === moduleType) {
        foundGlue = glue;
      }
    }

    return <T>foundGlue;
  }

  private getFrameID(glue: GlueModule): number {
    const keys = Object.keys(this.frameIDToGlueMap);
    let frameID = -1;
    for (const key of keys) {
      const id = Number.parseInt(key, 10);
      const glueModules = this.frameIDToGlueMap[id];
      const glueIndex = glueModules.indexOf(glue);

      if (glueIndex >= 0) {
        frameID = id;
        break;
      }
    }

    return frameID;
  }
}
