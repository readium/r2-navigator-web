import { assert } from 'chai';
import { Location } from '../../src/navigator/location';
import { Navigator } from '../../src/navigator/navigator';
import { ReadingSystem } from '../../src/navigator/reading-system';
import { StreamerClient } from '../../src/navigator/streamer-client';
import { LayoutView } from '../../src/navigator/views/layout-view';
import { Viewport } from '../../src/navigator/views/viewport';
import { Publication } from '../../src/streamer/publication';
import { openRendition } from '../helpers/reader-helper';

describe('Viewport', () => {

  let viewportDiv: HTMLElement;
  let layoutView: LayoutView;
  let viewport: Viewport;

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

    const rs = new ReadingSystem();
    const streamerClient = new StreamerClient();

    viewport = new Viewport(viewportDiv);

    // tslint:disable-next-line:max-line-length
    const publication = await streamerClient.openPublicationFromUrl('/fixtures/publications/metamorphosis/manifest.json');
    layoutView = new LayoutView(publication);
    layoutView.setPageSize(400, 400);

    viewport.setView(layoutView);
    viewport.setViewportSize(800);

  });

  afterEach(() => {
    document.body.removeChild(viewportDiv);
  });

  describe('#Viewport', () => {
    it('renderAtSpineItem()', async () => {
      await viewport.renderAtSpineItem(1);
      await viewport.renderAtOffset(-300);

      assert.equal(layoutView.getLoadedStartPostion(), -400);
      assert.equal(layoutView.getLoadedEndPosition(), 800);
    });
  });
});
