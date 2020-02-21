// tslint:disable:no-non-null-assertion

// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import * as simulateEvent from 'simulate-event';
import { ContentEventManager, ScrollMode, SpreadMode } from '../../src/navigator';
import { Resource } from '../../src/utils/injection-resolver';
import { sleep } from '../../src/utils/misc';

import { HostEnv } from '../helpers/host-env';

describe('ContentEventManager', () => {
  let hostEnv: HostEnv;

  const initBook = async (url: string): Promise<void> => {
    hostEnv = new HostEnv();

    await hostEnv.openPublicationR2(url);

    const rendition = hostEnv.getRendition();
    rendition.viewport.setViewportSize(600, 800);

    rendition.setPageLayout({
      spreadMode: SpreadMode.Freeform,
      pageWidth: 400,
      pageHeight: 800,
    });
    rendition.setViewAsVertical(false);
    rendition.viewport.setScrollMode(ScrollMode.None);

    await rendition.render();

    const ctx = hostEnv.getRenditionContext();
    const loader = ctx.iframeLoader;

    const iframePayloadRes: Resource = {
      href: '/fixtures/iframe-payload.js',
      type: 'text/javascript',
      target: 'head',
      insertion: 'append',
    };
    const glueServicesRes: Resource = {
      href: '/fixtures/glue-js/ReadiumGlue-services.js',
      type: 'text/javascript',
      target: 'head',
      insertion: 'append',
    };
    const glueRpcsRes: Resource = {
      href: '/fixtures/glue-js/ReadiumGlue-rpc.js',
      type: 'text/javascript',
      target: 'head',
      insertion: 'append',
    };
    const glueSharedesRes: Resource = {
      href: '/fixtures/glue-js/ReadiumGlue-shared.js',
      type: 'text/javascript',
      target: 'head',
      insertion: 'append',
    };

    // order is important!
    loader.registerInjectableResources([
      glueRpcsRes,
      glueSharedesRes,
      glueServicesRes,
      iframePayloadRes,
    ]);
  };

  before(() => {
    const head = document.querySelector('head');
    if (head) {
      head.innerHTML +=
        '<link rel="stylesheet" type="text/css" href="fixtures/window.css">';
    }
  });

  afterEach(() => {
    hostEnv.clear();
  });

  describe('iframe event', () => {
    beforeEach(async () => {
      await initBook('/fixtures/publications/metamorphosis/manifest.json');
    });

    it('click', async () => {
      const eventManager = new ContentEventManager(hostEnv.getRenditionContext().iframeLoader);

      const rendition = hostEnv.getRendition();
      await rendition.viewport.renderAtOffset(0);

      const contentView = rendition.viewport.getSpineItemView(0)?.getContentView();
      const iframe: HTMLIFrameElement = (<any>contentView).iframe;

      const clickListener = () => {
        clicked = true;
      };

      let clicked: boolean = false;
      eventManager.addContentEventListener('click', clickListener);
      await eventManager.updateContentEvents();

      simulateEvent.simulate(iframe.contentWindow?.document!.body, 'click');
      await sleep(100);
      assert(clicked);

      clicked = false;
      eventManager.removeContentEventListener('click', clickListener);
      await eventManager.updateContentEvents();
      await sleep(100);

      simulateEvent.simulate(iframe.contentWindow?.document!.body, 'click');
      await sleep(100);
      assert(!clicked);
    });

  });
});
