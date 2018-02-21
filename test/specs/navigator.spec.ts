// tslint:disable:no-non-null-assertion

// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { Location } from '../../src/navigator/location';
import { Navigator } from '../../src/navigator/navigator';
import { Publication } from '../../src/streamer/publication';

import { openRendition } from '../helpers/reader-helper';

describe('Navigator', () => {
  let viewportDiv: HTMLElement;
  let navigator: Navigator;

  let bookInitLocation: Location;

  before(() => {
    const head = document.querySelector('head');
    if (head) {
      head.innerHTML +=
        '<link rel="stylesheet" type="text/css" href="fixtures/window.css">';
    }
  });

  beforeEach(async () => {
    viewportDiv = document.createElement('div');
    viewportDiv.setAttribute('id', 'viewport');

    document.body.appendChild(viewportDiv);

    const rendition = await openRendition('/fixtures/publications/metamorphosis/manifest.json');
    rendition.setPageSize(400, 800);
    rendition.viewport.setViewportSize(600);
    rendition.viewport.enableScroll(false);

    await rendition.render();

    await rendition.viewport.renderAtOffset(0);

    navigator = new Navigator(rendition);
    bookInitLocation = navigator.getCurrentLocation()!;
  });

  afterEach(() => {
    document.body.removeChild(viewportDiv);
  });

  describe('#rendition', () => {
    it('render()', async () => {
      const loc = navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[title-page]/2/1:0');
      assert.equal(loc!.getHref(), 'OEBPS/title-page.html');
    });
  });

  describe('#navigator', () => {
    it('nextScreen()', async () => {
      await navigator.nextScreen();

      await navigator.ensureLoaded();

      const loc = navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[copyright-page]/2/2/1:0');
      assert.equal(loc!.getHref(), 'OEBPS/copyright.html');
    });

    it('prevScreen()', async () => {
      await navigator.nextScreen();
      await navigator.nextScreen();
      await navigator.previousScreen();

      await navigator.ensureLoaded();

      const loc = navigator.getCurrentLocation();

      assert(loc);
      assert.equal(loc!.getLocation(), '/4/2[copyright-page]/2/2/1:0');
      assert.equal(loc!.getHref(), 'OEBPS/copyright.html');
    });

    it('screen check functions', () => {
      assert.equal(navigator.isFirstScreen(), true);
      assert.equal(navigator.isLastScreen(), false);
      assert.equal(navigator.isFirstScreenSpine(), true);
      assert.equal(navigator.isFinalScreenSpine(), true);

      // assert.equal(navigator.getScreenCountSpine(), 1);
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
});
