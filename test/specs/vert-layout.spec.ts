import { assert } from 'chai';
import { Location, Navigator, ScrollMode, SpreadMode } from '../../src/navigator';
import { sleep } from '../../src/utils/misc';

import { HostEnv } from '../helpers/host-env';

describe('Vertical Layout', () => {
  let hostEnv: HostEnv;
  let navigator: Navigator;

  let bookInitLocation: Location | undefined | null;

  const initBook = async (url: string): Promise<void> => {
    hostEnv = new HostEnv();

    await hostEnv.openPublicationR2(url);

    const rendition = hostEnv.getRendition();
    const viewportDiv = hostEnv.getViewportDiv();
    viewportDiv.style.width = '600px';
    viewportDiv.style.height = '800px';
    rendition.viewport.setViewportSize(800, 600);

    rendition.setPageLayout({
      spreadMode: SpreadMode.Freeform,
      pageWidth: 400,
      pageHeight: 800,
    });
    rendition.setViewAsVertical(true);
    rendition.viewport.setPrefetchSize(50);
    await rendition.render();

    rendition.viewport.setScrollMode(ScrollMode.Publication);

    await rendition.viewport.renderAtOffset(0);

    navigator = new Navigator(rendition);
    bookInitLocation = await navigator.getCurrentLocation()!;
  };

  before(() => {
    const head = document.querySelector('head');
    if (head) {
      head.innerHTML += '<link rel="stylesheet" type="text/css" href="fixtures/window.css">';
    }
  });

  afterEach(() => {
    hostEnv.clear();
  });

  describe('navigator-vertical', () => {
    beforeEach(async () => {
      await initBook('/fixtures/publications/metamorphosis/manifest.json');
    });

    it('gotoLocation()', async () => {
      const newLoc = new Location(
        '/4/2[chapter-i]/4/2/1:276',
        'text/html',
        'OEBPS/chapter-001-chapter-i.html',
        [],
      );
      await navigator.gotoLocation(newLoc);
      await sleep(100);

      const loc = await navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[chapter-i]/4/2/1:227');
      assert.equal(loc!.getHref(), 'OEBPS/chapter-001-chapter-i.html');
    });

    it('scroll', (done) => {
      const viewportDiv = hostEnv.getViewportDiv();
      const rendition = hostEnv.getRendition();
      rendition.viewport.onVisiblePagesReady(() => {
        const spView4 = rendition.viewport.getSpineItemView(4);
        assert(spView4);
        done();
      });

      viewportDiv.scrollTop = 450;
    });
  });
});
