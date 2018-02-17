// tslint:disable-next-line:no-implicit-dependencies
import { assert } from 'chai';
import { Location } from '../../src/navigator/location';
import { Navigator } from '../../src/navigator/navigator';
import { ReadingSystem } from '../../src/navigator/reading-system';
import { StreamerClient } from '../../src/navigator/streamer-client';
import { LayoutView } from '../../src/navigator/views/layout-view';
import { Publication } from '../../src/streamer/publication';
import { openRendition } from '../helpers/reader-helper';

describe('LayoutView', () => {
  let viewportDiv: HTMLElement;
  let layoutView: LayoutView;

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

    const viewport = document.getElementById('viewport');
    if (viewport) {
      rs.initRenderer(viewport);
    }

    const publication = await streamerClient.openPublicationFromUrl(
      '/fixtures/publications/metamorphosis/manifest.json',
    );
    layoutView = new LayoutView(publication);

    layoutView.setPageSize(200, 400);
    layoutView.attatchToHost(viewportDiv);
  });

  afterEach(() => {
    document.body.removeChild(viewportDiv);
  });

  describe('#LayoutView', () => {
    it('ensureConentLoadedAtRange()', async () => {
      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 0);

      await layoutView.ensureConentLoadedAtRange(0, 250);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 600);
    });

    it('ensureContentLoadedAtSpineItemRange()', async () => {
      await layoutView.ensureContentLoadedAtSpineItemRange(2, 3);

      assert.equal(layoutView.getLoadedStartPostion(), 0);
      assert.equal(layoutView.getLoadedEndPosition(), 400);

      await layoutView.ensureConentLoadedAtRange(-100, 100);

      assert.equal(layoutView.getLoadedStartPostion(), -400);
      assert.equal(layoutView.getLoadedEndPosition(), 200);
    });
  });
});
