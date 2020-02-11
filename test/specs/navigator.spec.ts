// tslint:disable:no-non-null-assertion

// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { Location, Navigator, ScrollMode, SpreadMode } from '../../src/navigator';

import { HostEnv } from '../helpers/host-env';

describe('Navigator', () => {
  let hostEnv: HostEnv;
  let navigator: Navigator;

  let bookInitLocation: Location | undefined | null;

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

    await rendition.viewport.renderAtOffset(0);

    navigator = new Navigator(rendition);
    bookInitLocation = await navigator.getCurrentLocation()!;
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

  describe('rendition', () => {
    it('render()', async () => {
      await initBook('/fixtures/publications/metamorphosis/manifest.json');

      const loc = await navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[title-page]/2/1:0');
      assert.equal(loc!.getHref(), 'OEBPS/title-page.html');
    });
  });

  describe('navigator', () => {
    beforeEach(async () => {
      await initBook('/fixtures/publications/metamorphosis/manifest.json');
    });

    it('nextScreen()', async () => {
      await navigator.nextScreen();

      const loc = await navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[copyright-page]/2/2/1:32');
      assert.equal(loc!.getHref(), 'OEBPS/copyright.html');
    });

    it('prevScreen()', async () => {
      await navigator.nextScreen();
      await navigator.nextScreen();
      await navigator.previousScreen();

      const loc = await navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[copyright-page]/2/2/1:32');
      assert.equal(loc!.getHref(), 'OEBPS/copyright.html');
    });

    it('screen check functions', async () => {
      assert.equal(navigator.isFirstScreen(), true);
      assert.equal(navigator.isLastScreen(), false);
      assert.equal(navigator.isFirstScreenSpine(), true);
      assert.equal(navigator.isFinalScreenSpine(), true);

      assert.equal(navigator.getScreenCountSpine(), 1);
    });

    it('gotoLocation()', async () => {
      // TODO Fragments isn't used in Navigator yet, so it's empty at the moment
      const newLoc =
        new Location(
          '/4/2[copyright-page]/2/2/1:32',
          'text/html',
          'OEBPS/copyright.html',
          [],
        );
      await navigator.gotoLocation(newLoc);

      const loc = await navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[copyright-page]/2/2/1:0');
      assert.equal(loc!.getHref(), 'OEBPS/copyright.html');
    });

    // it('gotoScreen()', async () => {
    //   await navigator.nextScreen();
    //   await navigator.nextScreen();
    //   await navigator.nextScreen();
    //   await navigator.nextScreen();

    //   assert.equal(navigator.getScreenCountSpine(), 17);

    //   await navigator.gotoScreenSpine(5);

    //   assert.equal(navigator.isFirstScreenSpine(), false);
    //   assert.equal(navigator.getCurrentScreenIndexSpine(), 5);
    // });
  });

  describe('#navigator-fixed-layout', () => {
    beforeEach(async () => {
      await initBook('/fixtures/publications/igp-twss-fxl/manifest.json');
    });

    it('GoToRightPageDoublePageSpread', async () => {
      const rendition = hostEnv.getRendition();
      rendition.viewport.setPrefetchSize(100);
      rendition.setPageLayout({ spreadMode: SpreadMode.FitViewportDoubleSpread });

      const rightPageLocation = new Location(
        '',
        'application/xhtml+xml',
        'OPS/s011-Poem-001.xhtml',
        [],
      );
      await navigator.gotoLocation(rightPageLocation);

      const loc = await navigator.getScreenBegin();
      assert(loc);
      assert.equal(loc!.getHref(), 'OPS/s010-Section-004.xhtml');

      const endLoc = await navigator.getScreenEnd();
      assert(endLoc);
      assert.equal(endLoc!.getHref(), rightPageLocation.getHref());
    });

    it('GoToFirstPageDoublePageSpread', async () => {
      // first page marked right by default unless explicitly defined

      const rendition = hostEnv.getRendition();
      rendition.viewport.setPrefetchSize(100);
      rendition.setPageLayout({ spreadMode: SpreadMode.FitViewportDoubleSpread });

      const rightPageLocation = new Location(
        '',
        'application/xhtml+xml',
        'OPS/s001-Cover-01.xhtml',
        [],
      );
      await navigator.gotoLocation(rightPageLocation);

      const loc = await navigator.getScreenBegin();
      assert(loc);
      assert.equal(loc!.getHref(), rightPageLocation.getHref());

      const endLoc = await navigator.getScreenEnd();
      assert(endLoc);
      assert.equal(endLoc!.getHref(), rightPageLocation.getHref());
    });

    it('nextScreen()', async () => {
      await navigator.nextScreen();
      await navigator.nextScreen();

      const loc = await navigator.getCurrentLocation();
      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2/2[Copyright1]/2[copyright1]/2[p2]/2/1:0');
      assert.equal(loc!.getHref(), 'OPS/s004-Copyright-01.xhtml');
    });

    it('gotoLocation()', async () => {
      const newLoc = new Location(
        '/4/2/2[Epigraph1]/2[title-block2]/2[h12]/1:0',
        'application/xhtml+xml',
        'OPS/s005-Epigraph-01.xhtml',
        [],
      );
      await navigator.gotoLocation(newLoc);

      const loc = await navigator.getCurrentLocation();
      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2/2[Epigraph1]/2[title-block2]/2[h12]/1:0');
      assert.equal(loc!.getHref(), 'OPS/s005-Epigraph-01.xhtml');
    });

    it('gotoAnchorLocation()', async () => {
      await navigator.gotoAnchorLocation('OPS/s021-Poem-008.xhtml', 'pagebreak-rw_13');

      const loc = await navigator.getCurrentLocation();
      console.log(loc);
    });
  });
});
